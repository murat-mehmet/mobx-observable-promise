import isEqual from 'lodash.isequal';
import {action, runInAction} from 'mobx';
import {LoggingLevel} from "./Logger";
import {ObservablePromise, PromiseAction} from "./ObservablePromise";

export class CachedObservablePromise<T extends PromiseAction> extends ObservablePromise<T> {
    private _apiCalls = [];

    execute(...callArgs: Parameters<T>) {
        if (this._isWaitingForResponse) {
            if (this._queued) {
                this.logger.log(LoggingLevel.verbose, `(${this.name}) Added execution to queue`);
                this._promise = this._promise.finally(() => this.execute(...callArgs));
            } else {
                this.logger.log(LoggingLevel.info, `(${this.name}) Skipped execution, an execution is already in progress`, {args: callArgs});
            }
            return this;
        }
        this.logger.log(LoggingLevel.verbose, `(${this.name}) Begin execution`, {args: callArgs});

        const existingApiCall = this._findApiCall(callArgs);
        if (!existingApiCall) {
            this._currentCall = this._addApiCall(callArgs);
        } else {
            this.logger.log(LoggingLevel.info, `(${this.name}) Skipped execution, resolving cached result`);
            this._currentCall = existingApiCall;

            this.handleSuccess(existingApiCall.result);
            this._promise = Promise.resolve(existingApiCall.result);
            return this;
        }

        runInAction(() => {
            this.isExecuting = true;
        });

        this._isWaitingForResponse = true;
        this._promise = new Promise((resolve, reject) => {
            this._action(...callArgs as any)
                .then((result) => {
                    if (result instanceof Error)
                        this.handleError(result, reject);
                    else {
                        if (this._parser) {
                            try {
                                result = this._parser(result, callArgs);
                                this.logger.log(LoggingLevel.verbose, `(${this.name}) Parsed result`);
                            } catch (e) {
                                result = e;
                                this.logger.log(LoggingLevel.error, `(${this.name}) Could not parse result (${e})`);
                            }
                            if (result instanceof Error) {
                                this.handleError(result, reject);
                                return result;
                            }
                        }

                        this.handleSuccess(result, resolve);
                    }
                    return result;
                })
                .catch((error) => {
                    this.handleError(error, reject);
                });
        });

        return this;
    }

    clear() {
        this._apiCalls = [];
        this.logger.log(LoggingLevel.verbose, `(${this.name}) Cleared cache`);
    }

    clone() {
        return new CachedObservablePromise<T>(this._action, this._parser, this.name);
    }

    @action
    protected handleError(error, reject) {
        this._apiCalls = this._apiCalls.filter(h => h != this._currentCall);
        super.handleError(error, reject);
    }

    private _addApiCall(args) {
        const newCall = {args, result: null};
        this._apiCalls.push(newCall);
        return newCall;
    }

    private _findApiCall(args) {
        return this._apiCalls.find(c => isEqual(c.args, args));
    }
}
