import {action, observable, runInAction} from "mobx";
import {LoggingLevel} from "./Logger";
import {ObservablePromise, PromiseAction, PromiseReturnType} from "./ObservablePromise";

export class InfiniteObservablePromise<T extends PromiseAction> extends ObservablePromise<T> {

    @observable resultArray: PromiseReturnType<T> = null;
    @observable hasMore = true;
    @observable totalItems = 0;
    @observable totalPages = 0;

    private _resolver: PageResolver;

    constructor(action: T, resolver: PageResolver, parser?: (result: any, callArgs: any[]) => PromiseReturnType<T>, name?: string) {
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
        if (this._isWaitingForResponse) {
            if (this._queued) {
                this.logger.log(LoggingLevel.verbose, `(${this.name}) Added execution to queue`);
                this._promise = this._promise.finally(() => this.execute(...callArgs));
            } else {
                this.logger.log(LoggingLevel.info, `(${this.name}) Skipped execution, an execution is already in progress`, {args: callArgs});
            }
            return this;
        }
        this.logger.log(LoggingLevel.verbose, `(${this.name}) Begin execution (${isFirst ? 'initial' : 'subsequent'})`, {args: callArgs});

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
                                this.logger.log(LoggingLevel.verbose, `(${this.name}) Parsed result`);
                            } catch (e) {
                                result = e
                                this.logger.log(LoggingLevel.error, `(${this.name}) Could not parse result (${e})`);
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

    getResultArrayOrDefault(def?: PromiseReturnType<T>): PromiseReturnType<T> {
        if (!this.wasSuccessful)
            return def || [] as any;
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
        this.logger.log(LoggingLevel.verbose, `(${this.name}) Resolving array`, {args, result});
        const resolvedArray = this._resolver.resolve(result, args);
        if (this._resolver.hasMore)
            this.hasMore = this._resolver.hasMore(result, args);
        else
            this.hasMore = resolvedArray.length > 0;
        if (this._resolver.totalCount)
            this.totalItems = this._resolver.totalCount(result);
        if (this._resolver.totalPages)
            this.totalPages = this._resolver.totalPages(result);
        this.logger.log(LoggingLevel.verbose, `(${this.name}) Resolved array`, {
            resolvedArray,
            hasMore: this.hasMore,
            totalItems: this.totalItems,
            totalPages: this.totalPages
        });
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
