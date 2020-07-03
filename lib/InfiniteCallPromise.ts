import {Methods} from "./CallPromise";
import {InfiniteObservablePromise, PageResolver} from "./InfiniteObservablePromise";
import {PromiseAction, PromiseReturnType} from "./ObservablePromise";

export class InfiniteCallPromise<T, M extends keyof Methods<T>> extends InfiniteObservablePromise<T[M] extends PromiseAction ? (...callArgs: Parameters<T[M]>) => Promise<T[M] extends (...args: any) => Promise<infer R> ? R : any> : never> {
    constructor(readonly api: T, readonly method: M, readonly resolver: PageResolver, parser?: (result: any, callArgs: any[]) => PromiseReturnType<T[M] extends PromiseAction ? (...callArgs: Parameters<T[M]>) => T[M] : never>, name?: string) {
        super((api[method] as any).bind(api), resolver, parser, name || method.toString())
    }

    clone() {
        return new InfiniteCallPromise<T, M>(this.api,this.method, this.resolver, this._parser as any, this.name);
    }
}