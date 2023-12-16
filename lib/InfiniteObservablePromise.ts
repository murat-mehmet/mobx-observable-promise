import {action, observable, runInAction, toJS} from "mobx";
import {LoggingLevel} from "./Logger";
import {ObservablePromise, ObservablePromiseOptions, PersistedObject, PromiseAction, PromiseReturnType} from "./ObservablePromise";

export class InfiniteObservablePromise<T extends PromiseAction> extends ObservablePromise<T> {

    @observable resultArray: PromiseReturnType<T> = null;
    @observable hasMore = true;
    @observable totalItems = 0;
    @observable totalPages = 0;

    private readonly _resolver: PageResolver;

    constructor(action: T, resolver: PageResolver, options: ObservablePromiseOptions<T>)
    constructor(action: T, resolver: PageResolver, parser?: (result: any, callArgs: any[]) => PromiseReturnType<T>, name?: string)
    constructor(action: T, resolver: PageResolver, parserOrOptions?: ObservablePromiseOptions<T> | ((result: any, callArgs: any[]) => PromiseReturnType<T>), name?: string) {
        super(action, parserOrOptions as any, name);
        this._resolver = resolver;
    }

    execute(...callArgs: Parameters<T>) {
        return this._executeInternal(callArgs, true);
    }

    executeNext(...callArgs) {
        return this._executeInternal(callArgs, false);
    }

    _executeInternal(callArgs, isFirst: boolean) {
        if (this._mutex.isLocked()) {
            if (!this._options.queued) {
                this.logger.log(LoggingLevel.info, `(${this._options.name}) Skipped execution (${isFirst ? 'initial' : 'next'}), an execution is already in progress`, {args: callArgs});
                return this;
            } else {
                this.logger.log(LoggingLevel.verbose, `(${this._options.name}) Added execution (${isFirst ? 'initial' : 'next'}) to queue`, {args: callArgs});
            }
        }

        this._promise = this._mutex.runExclusive(() => new Promise((resolve, reject) => {
            this.logger.log(LoggingLevel.info, `(${this._options.name}) Begin execution (${isFirst ? 'initial' : 'next'})`, {args: callArgs});

            if (!isFirst && callArgs.length == 0)
                callArgs = this._resolver.nextArgs(this.result, this.args);

            runInAction(() => {
                this.isExecuting = true;
            });

            this._currentCall = {args: callArgs, result: null};
            this._action(...callArgs as any)
                .then((result) => {
                    if (result instanceof Error)
                        this.handleError(result, reject);
                    else {
                        if (this._options.parser) {
                            try {
                                this.logger.log(LoggingLevel.verbose, `(${this._options.name}) Parsing result`, result);
                                result = this._options.parser(result, callArgs) as any;
                            } catch (e) {
                                result = e
                                this.logger.log(LoggingLevel.error, `(${this._options.name}) Could not parse result (${e})`);
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
                })
                .catch((error) => {
                    this.handleError(error, reject);
                });

        }));
        return this;

    }

    getList(defaultValue?: (PromiseReturnType<T> | (() => PromiseReturnType<T>))): PromiseReturnType<T> {
        const {resultArray} = this;
        if (!this.wasSuccessful)
            return (typeof defaultValue == 'function' ? (defaultValue as any)() : defaultValue) || [];
        return resultArray;
    }

    /**
     * @deprecated Use {@link getList} and {@link getResultOf}
     * @param def
     */
    getResultArrayOrDefault(def?: PromiseReturnType<T>): PromiseReturnType<T> {
        return this.getList(def);
    }

    @action reset() {
        this.hasMore = true;
        this.resultArray = null;
        return super.reset();
    }

    clone(options?: ObservablePromiseOptions<T>) {
        return new InfiniteObservablePromise<T>(this._action, this._resolver, {...this._options, ...options});
    }

    resolve(result: any) {
        this.resultArray = null;
        this.handleSuccess(result, null);
    }

    @action
    protected handleSuccess(result, resolve, skipPersist?) {
        if (!this.resultArray)
            this.resultArray = [] as any;
        const args = this.args;
        this.logger.log(LoggingLevel.verbose, `(${this._options.name}) Resolving array`, {args, result});
        const resolvedArray = this._resolver.resolve(result, args);
        if (this._resolver.hasMore)
            this.hasMore = this._resolver.hasMore(result, args);
        else
            this.hasMore = resolvedArray.length > 0;
        if (this._resolver.totalCount)
            this.totalItems = this._resolver.totalCount(result);
        if (this._resolver.totalPages)
            this.totalPages = this._resolver.totalPages(result);
        this.logger.log(LoggingLevel.verbose, `(${this._options.name}) Resolved array`, {
            resolvedArray,
            hasMore: this.hasMore,
            totalItems: this.totalItems,
            totalPages: this.totalPages
        });
        if (resolvedArray.length > 0)
            (this.resultArray as any).push(...resolvedArray);
        super.handleSuccess(result, resolve, skipPersist);
    }

    @action
    protected restoreResult(persistedObject: PersistedObject) {
        super.restoreResult(persistedObject);
        if (persistedObject['resultArray'] != null)
            this.resultArray = toJS(persistedObject['resultArray']);
        if (persistedObject['hasMore'] != null)
            this.hasMore = toJS(persistedObject['hasMore']);
        if (persistedObject['totalItems'] != null)
            this.totalItems = toJS(persistedObject['totalItems']);
        if (persistedObject['totalPages'] != null)
            this.totalPages = toJS(persistedObject['totalPages']);
    }

    @action
    protected persistResult(persistedObject: PersistedObject) {
        persistedObject['resultArray'] = this.resultArray;
        persistedObject['hasMore'] = this.hasMore;
        if (this.totalItems)
            persistedObject['totalItems'] = this.totalItems;
        if (this.totalPages)
            persistedObject['totalPages'] = this.totalPages;
        super.persistResult(persistedObject);
    }
}

export interface PageResolver {
    resolve: (result: any, callArgs: any[]) => any[],
    nextArgs: (result: any, callArgs: any[]) => any[],
    hasMore?: (result: any, callArgs: any[]) => boolean,
    totalCount?: (result: any) => number,
    totalPages?: (result: any) => number,
}
