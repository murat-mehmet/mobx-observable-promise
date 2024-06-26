import isEqual from 'lodash.isequal';
import {makeObservable, override, runInAction, toJS} from 'mobx';
import {LoggingLevel} from "./Logger";
import {ObservablePromise, ObservablePromiseOptions, PersistedObject, PromiseAction, PromiseReturnType} from "./ObservablePromise";

export class CachedObservablePromise<T extends PromiseAction> extends ObservablePromise<T> {
    private _apiCalls = [];

    constructor(action: T, options: ObservablePromiseOptions<T>)
    constructor(action: T, parser?: (result: any, callArgs: any[]) => PromiseReturnType<T>, name?: string)
    constructor(action: T, parserOrOptions?: ObservablePromiseOptions<T> | ((result: any, callArgs: any[]) => PromiseReturnType<T>), name?: string) {
        super(action, parserOrOptions as any, name);
        makeObservable(this);
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
        this.logger.log(LoggingLevel.verbose, `(${this._options.name}) Cleared cache`);
        this._apiCalls = [];
        if (this.persistStore) {
            let persistObject = this.persistStore[this._options.name];
            if (!persistObject)
                persistObject = {};
            this.persistResult(persistObject);
        }
    }

    clone(options?: ObservablePromiseOptions<T>) {
        return new CachedObservablePromise<T>(this._action, {...this._options, ...options});
    }

    @override
    protected handleError(error, reject) {
        this._apiCalls = this._apiCalls.filter(h => !isEqual(h.args, this._currentCall.args));
        if (this.persistStore) {
            let persistObject = this.persistStore[this._options.name];
            if (!persistObject)
                persistObject = {};
            this.persistResult(persistObject);
        }
        super.handleError(error, reject);
    }

    @override
    protected restoreResult(persistedObject: PersistedObject) {
        const didRestore = super.restoreResult(persistedObject);
        if (!didRestore)
            return false;
        if (persistedObject['apiCalls'] != null)
            this._apiCalls = toJS(persistedObject['apiCalls']);
        return true;
    }

    @override
    protected persistResult(persistedObject: PersistedObject) {
        persistedObject['apiCalls'] = this._apiCalls.filter(x => !x.expires || x.expires > Date.now());
        super.persistResult(persistedObject);
    }

    isCached(...callArgs: Parameters<T>){
        return !!this._findApiCall(callArgs);
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
