import isEqual from 'lodash.isequal';
import {action, runInAction} from 'mobx';
import {ObservablePromise, PromiseAction} from "./ObservablePromise";

export class CachedObservablePromise<T extends PromiseAction> extends ObservablePromise<T> {
    private _apiCalls = [];
    private _isInvalidated = true;

    execute(...callArgs: Parameters<T>) {
        if (this._isWaitingForResponse) return this;

        const existingApiCall = this._findApiCall(callArgs);
        if (!existingApiCall) {
            this._isInvalidated = true;
            this._currentCall = this._addApiCall(callArgs);
        } else {
            this._currentCall = existingApiCall;

            this.handleSuccess(existingApiCall.result);
            this._promise = Promise.resolve(existingApiCall.result)
        }

        if (!this._isInvalidated) {
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
                            } catch (e) {
                                result = e;
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

    emptyCache() {
        this._apiCalls = [];
    }

    clone() {
        return new CachedObservablePromise<T>(this._action, this._parser, this.name);
    }

    @action
    protected handleSuccess(result, resolve?) {
        this._isInvalidated = false;
        super.handleSuccess(result, resolve);
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
