import {makeObservable} from "mobx";
import {ObservablePromise, ObservablePromiseOptions, PromiseAction, PromiseReturnType} from "./ObservablePromise";

export type Methods<T> = Pick<T, {
    [K in keyof T]: T[K] extends PromiseAction ? K : never
}[keyof T]>;

export type PromiseMethod<T, M extends keyof Methods<T>> = T[M] extends PromiseAction ? (...callArgs: Parameters<T[M]>) => Promise<T[M] extends (...args: any) => Promise<infer R> ? R : any> : never

export class CallPromise<T, M extends keyof Methods<T>> extends ObservablePromise<PromiseMethod<T, M>> {
    constructor(api: T, method: M, options: ObservablePromiseOptions<PromiseMethod<T, M>>)
    constructor(api: T, method: M, parser?: (result: any, callArgs: any[]) => T[M] extends PromiseAction ? PromiseReturnType<T[M]> : never, name?: string)
    constructor(readonly api: T, readonly method: M, parserOrOptions?: ObservablePromiseOptions<PromiseMethod<T, M>> | ((result: any, callArgs: any[]) => T[M] extends PromiseAction ? PromiseReturnType<T[M]> : never), name?: string) {
        super((api[method] as any).bind(api), parserOrOptions as any, name || method.toString());
        makeObservable(this);
    }

    clone(options?: ObservablePromiseOptions<PromiseMethod<T, M>>) {
        return new CallPromise<T, M>(this.api, this.method, {...this._options, ...options});
    }
}
