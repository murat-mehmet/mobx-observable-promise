import isEqual from 'lodash.isequal';
import {action, runInAction} from 'mobx';
import {LoggingLevel} from "./Logger";
import {ObservablePromise, ObservablePromiseOptions, PersistedObject, PromiseAction, PromiseReturnType} from "./ObservablePromise";

export class CachedObservablePromise<T extends PromiseAction> extends ObservablePromise<T> {
    private _apiCalls = [];

    constructor(action: T, options: ObservablePromiseOptions<T>)
    constructor(action: T, parser?: (result: any, callArgs: any[]) => PromiseReturnType<T>, name?: string)
    constructor(action: T, parserOrOptions?: ObservablePromiseOptions<T> | ((result: any, callArgs: any[]) => PromiseReturnType<T>), name?: string) {
        super(action, parserOrOptions as any, name);
    }

    execute(...callArgs: Parameters<T>) {
        if (this._mutex.isLocked()) {
            if (!this._options.queued) {
                this.logger.log(LoggingLevel.info, `(${this._options.name}) Skipped execution, an execution is already in progress`, {args: callArgs});
                return this;
            } else
                this.logger.log(LoggingLevel.verbose, `(${this._options.name}) Added execution to queue`, {args: callArgs});
        }

        this._promise = this._mutex.runExclusive(() => new Promise((resolve, reject) => {
            const existingApiCall = this._findApiCall(callArgs);
            if (!existingApiCall) {
                this.logger.log(LoggingLevel.info, `(${this._options.name}) Begin execution`, {args: callArgs});
                this._currentCall = this._addApiCall(callArgs);
            } else {
                this.logger.log(LoggingLevel.info, `(${this._options.name}) Skipped execution, resolving cached result`);
                this._currentCall = existingApiCall;

                return this.handleSuccess(existingApiCall.result, resolve, true);
            }

            runInAction(() => {
                this.isExecuting = true;
            });

            this._action(...callArgs as any)
                .then((result) => {
                    if (result instanceof Error)
                        this.handleError(result, reject);
                    else {
                        if (this._options.parser) {
                            try {
                                this.logger.log(LoggingLevel.verbose, `(${this._options.name}) Parsing result`, result);
                                result = this._options.parser(result, callArgs);
                            } catch (e) {
                                result = e;
                                this.logger.log(LoggingLevel.error, `(${this._options.name}) Could not parse result (${e})`);
                            }
                            if (result instanceof Error) {
                                this.handleError(result, reject);
                                return result;
                            }
                        }

                        this.handleSuccess(result, resolve);
                    }
                })
                .catch((error) => {
                    this.handleError(error, reject);
                });

        }));
        return this;

    }

    clear() {
        this._apiCalls = [];
        this.logger.log(LoggingLevel.verbose, `(${this._options.name}) Cleared cache`);
    }

    clone(options?: ObservablePromiseOptions<T>) {
        return new CachedObservablePromise<T>(this._action, {...this._options, ...options});
    }

    @action
    protected handleError(error, reject) {
        this._apiCalls = this._apiCalls.filter(h => h != this._currentCall);
        if (this.persistStore) {
            const persistObject = this.persistStore[this._options.name];
            this.persistResult(persistObject);
        }
        super.handleError(error, reject);
    }

    @action
    protected restoreResult(persistedObject: PersistedObject) {
        super.restoreResult(persistedObject);
        this._apiCalls = persistedObject['apiCalls'];
    }

    @action
    protected persistResult(persistedObject: PersistedObject) {
        persistedObject['apiCalls'] = this._apiCalls.filter(x => !x.expires || x.expires > Date.now());
        super.persistResult(persistedObject);
    }

    private _addApiCall(args) {
        const newCall = {args, result: null};
        if (this._options.expiresIn)
            newCall['expires'] = Date.now() + this._options.expiresIn;
        this._apiCalls.push(newCall);
        return newCall;
    }

    private _findApiCall(args) {
        return this._apiCalls.find(c => isEqual(c.args, args) && (!c.expires || c.expires > Date.now()));
    }
}
