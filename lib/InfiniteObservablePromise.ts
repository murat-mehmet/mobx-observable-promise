import {action, observable, runInAction} from "mobx";
import {ObservablePromise, PromiseAction, PromiseReturnType} from "./ObservablePromise";

export class InfiniteObservablePromise<T extends PromiseAction> extends ObservablePromise<T> {

    @observable resultArray: PromiseReturnType<T> = null;
    @observable hasMore = true;
    @observable totalItems = 0;
    @observable totalPages = 0;

    private _resolver: PageResolver;

    constructor(action: T, resolver: PageResolver, parser?: (result: any, callArgs: any[]) => PromiseReturnType<T>, readonly name?: string) {
        super(action, parser, name);
        this._resolver = resolver;
    }

    execute(...callArgs: Parameters<T>) {
        this._executeInternal(callArgs, true);
        return this;
    }

    executeNext(...callArgs) {
        this._executeInternal(callArgs.length > 0 ? callArgs : this._resolver.nextArgs(this.result, this.args), false);
        return this;
    }

    _executeInternal(callArgs, isFirst: boolean) {
        if (this._isWaitingForResponse) return this;

        runInAction(() => {
            this.isExecuting = true;
        });

        this._isWaitingForResponse = true;
        this._currentCall = {args: callArgs, result: null};

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
                            if (isFirst)
                                this.resultArray = null;
                            this.handleSuccess(result, resolve);
                        });
                    }
                    return result;
                })
                .catch((error) => {
                    this.handleError(error, reject);
                });
        });

        return this;
    }

    getResultArrayOrDefault(def?: PromiseReturnType<T>) {
        if (!this.wasSuccessful)
            return def || [];
        return this.resultArray;
    }

    @action reset() {
        super.reset();
        this.hasMore = true;
        this.resultArray = null;
        return this;
    }

    clone() {
        return new InfiniteObservablePromise<T>(this._action, this._resolver, this._parser, this.name);
    }

    resolve(result: any) {
        this.resultArray = null;
        this.handleSuccess(result, null);
    }

    @action
    protected handleSuccess(result, resolve) {
        if (!this.resultArray)
            this.resultArray = [] as any;
        const args = this.args;
        const resolvedArray = this._resolver.resolve(result, args);
        if (this._resolver.hasMore)
            this.hasMore = this._resolver.hasMore(result, args);
        else
            this.hasMore = resolvedArray.length > 0;
        if (this._resolver.totalCount)
            this.totalItems = this._resolver.totalCount(result);
        if (this._resolver.totalPages)
            this.totalPages = this._resolver.totalPages(result);
        if (resolvedArray.length > 0)
            (this.resultArray as any).push(...resolvedArray);
        super.handleSuccess(result, resolve);
    }
}

export interface PageResolver {
    resolve: (result: any, callArgs: any[]) => any[],
    nextArgs: (result: any, callArgs: any[]) => any[],
    hasMore?: (result: any, callArgs: any[]) => boolean,
    totalCount?: (result: any) => number,
    totalPages?: (result: any) => number,
}
