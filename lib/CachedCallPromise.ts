import {CachedObservablePromise} from "./CachedObservablePromise";
import {Methods} from "./CallPromise";
import {PromiseAction, PromiseReturnType} from "./ObservablePromise";

export class CachedCallPromise<T, M extends keyof Methods<T>> extends CachedObservablePromise<T[M] extends PromiseAction ? (...callArgs: Parameters<T[M]>) => Promise<T[M] extends (...args: any) => Promise<infer R> ? R : any> : never> {
    constructor(api: T, method: M, parser?: (result: any, callArgs: any[]) => PromiseReturnType<T[M] extends PromiseAction ? (...callArgs: Parameters<T[M]>) => T[M] : never>, name?: string) {
        super((api[method] as any).bind(api), parser, name || method.toString())
    }
}