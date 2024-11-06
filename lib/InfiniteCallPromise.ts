import {makeObservable} from "mobx";
import {Methods, PromiseMethod} from "./CallPromise";
import {InfiniteObservablePromise, PageResolver} from "./InfiniteObservablePromise";
import {ObservablePromiseOptions, PromiseAction, PromiseReturnType} from "./ObservablePromise";

export class InfiniteCallPromise<T, M extends keyof Methods<T>> extends InfiniteObservablePromise<PromiseMethod<T, M>> {
    constructor(api: T, method: M, resolver: PageResolver, options: ObservablePromiseOptions<PromiseMethod<T, M>>)
    constructor(api: T, method: M, resolver: PageResolver, parser?: (result: any, callArgs: any[]) => PromiseReturnType<T[M] extends PromiseAction ? (...callArgs: Parameters<T[M]>) => T[M] : never>, name?: string)
    constructor(readonly api: T, readonly method: M, readonly resolver: PageResolver, parserOrOptions?: ObservablePromiseOptions<PromiseMethod<T, M>> | ((result: any, callArgs: any[]) => PromiseReturnType<T[M] extends PromiseAction ? (...callArgs: Parameters<T[M]>) => T[M] : never>), name?: string) {
        super((api[method] as any).bind(api), resolver, parserOrOptions as any, name || method.toString());
        makeObservable(this);
    }

    clone(options?: ObservablePromiseOptions<PromiseMethod<T, M>>) {
        return new InfiniteCallPromise<T, M>(this.api, this.method, this.resolver, {...this._options, ...options});
    }
}
