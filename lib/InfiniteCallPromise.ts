import {action, observable, runInAction} from "mobx";
import {CallPromise, Methods} from "./CallPromise";
import {PromiseAction, PromiseReturnType} from "./ObservablePromise";

export class InfiniteCallPromise<T, M extends keyof Methods<T>> extends CallPromise<T, M> {

    @observable resultArray: PromiseReturnType<T[M] extends PromiseAction ? T[M] : any> = null;
    @observable hasMore = true;
    @observable totalItems = 0;
    @observable totalPages = 0;

    private _resolver: PageResolver;

    constructor(api: T, method: M, resolver: PageResolver, parser?: (result: any, callArgs: any[]) => any, name?: string) {
        super(api, method, parser, name || method.toString());
        this._resolver = resolver;
    }

    execute(...callArgs: Parameters<T[M] extends PromiseAction ? (...callArgs: Parameters<T[M]>) => Promise<any> : never>) {
        this._executeInternal(callArgs, true);
        return this;
    }

    executeNext(...callArgs) {
        this._executeInternal(callArgs.length > 0 ? callArgs : this._resolver.nextArgs(this.result, this._currentCall && this._currentCall.args), false);
        return this;
    }

    _executeInternal(callArgs, isFirst: boolean) {
        if (this._isWaitingForResponse) return this;

        runInAction(() => {
            this.isExecuting = true;
        });

        this._promise = new Promise((resolve, reject) => {
            this._action(...callArgs as any)
                .then((result) => {
                    if (result instanceof Error)
                        this.handleError(result, reject);
                    else {
                        if (this._parser) {
                            try {
                                result = this._parser(result, callArgs) as any;
                            } catch (e) {
                                result = e
                            }
                            if (result instanceof Error) {
                                this.handleError(result, reject);
                                return result;
                            }
                        }
                        runInAction(() => {
                            this.result = result as any;
                            if (!this.resultArray || isFirst)
                                this.resultArray = [] as any;
                            const resolvedArray = this._resolver.resolve(result, callArgs);
                            if (this._resolver.hasMore)
                                this.hasMore = this._resolver.hasMore(result, callArgs);
                            else
                                this.hasMore = resolvedArray.length > 0;
                            if (this._resolver.totalCount)
                                this.totalItems = this._resolver.totalCount(result);
                            if (this._resolver.totalPages)
                                this.totalPages = this._resolver.totalPages(result);
                            if (resolvedArray.length > 0)
                                (this.resultArray as any).push(...resolvedArray);
                            if (this._currentCall) this._currentCall.result = result;
                            this.isExecuting = false;
                            this.isError = false;
                            this.wasExecuted = true;
                            this._isWaitingForResponse = false;
                            this._triggerHooks();
                            resolve(result as any);
                        });
                    }
                    return result;
                })
                .catch((error) => {
                    this.handleError(error, reject);
                });
        });

        this._isWaitingForResponse = true;
        this._currentCall = {args: callArgs, result: null};
        return this;
    }

    getResultArrayOrDefault(def?: PromiseReturnType<T[M] extends PromiseAction ? T[M] : any>) {
        if (!this.wasSuccessful)
            return def || [];
        return this.resultArray;
    }

    @action reset() {
        super.reset();
        this.hasMore = true;
        this.resultArray = null;
        return this;
    };
}

export interface PageResolver {
    resolve: (result: any, callArgs: any[]) => any[],
    nextArgs: (result: any, callArgs: any[]) => any[],
    hasMore?: (result: any, callArgs: any[]) => boolean,
    totalCount?: (result: any) => number,
    totalPages?: (result: any) => number,
}