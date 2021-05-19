import {makeObservable} from "mobx";
import {CachedObservablePromise} from "./CachedObservablePromise";
import {Methods} from "./CallPromise";
import {ObservablePromiseOptions, PromiseAction, PromiseReturnType} from "./ObservablePromise";

export class CachedCallPromise<T, M extends keyof Methods<T>> extends CachedObservablePromise<T[M] extends PromiseAction ? (...callArgs: Parameters<T[M]>) => Promise<T[M] extends (...args: any) => Promise<infer R> ? R : any> : never> {
    constructor(api: T, method: M, options: ObservablePromiseOptions<T[M] extends PromiseAction ? (...callArgs: Parameters<T[M]>) => Promise<T[M] extends (...args: any) => Promise<infer R> ? R : any> : never>)
    constructor(api: T, method: M, parser?: (result: any, callArgs: any[]) => PromiseReturnType<T[M] extends PromiseAction ? (...callArgs: Parameters<T[M]>) => T[M] : never>, name?: string)
    constructor(readonly api: T, readonly method: M, parserOrOptions?: ObservablePromiseOptions<T[M] extends PromiseAction ? (...callArgs: Parameters<T[M]>) => Promise<T[M] extends (...args: any) => Promise<infer R> ? R : any> : never> | ((result: any, callArgs: any[]) => PromiseReturnType<T[M] extends PromiseAction ? (...callArgs: Parameters<T[M]>) => T[M] : never>), name?: string) {
        super((api[method] as any).bind(api), parserOrOptions as any, name || method.toString())
        makeObservable(this);
    }

    clone(options?: ObservablePromiseOptions<T[M] extends PromiseAction ? (...callArgs: Parameters<T[M]>) => Promise<T[M] extends (...args: any) => Promise<infer R> ? R : any> : never>) {
        return new CachedCallPromise<T, M>(this.api, this.method, {...this._options, ...options});
    }
}
