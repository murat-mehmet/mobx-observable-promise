import {makeObservable} from "mobx";
import {ObservablePromise, ObservablePromiseOptions, PromiseAction, PromiseReturnType} from "./ObservablePromise";

export type Methods<T> = Pick<T, {
    [K in keyof T]: T[K] extends PromiseAction ? K : never
}[keyof T]>;

export type PromiseMethod<T, M extends keyof Methods<T>> = T[M] extends PromiseAction ? (...callArgs: Parameters<T[M]>) => Promise<T[M] extends (...args: any) => Promise<infer R> ? R : any> : never

export class CallPromise<T, M extends keyof Methods<T>> extends ObservablePromise<PromiseMethod<T, M>> {
    constructor(readonly api: T, readonly method: M, options?: ObservablePromiseOptions<PromiseMethod<T, M>>) {
        super((api[method] as any).bind(api), {name: method.toString(), ...options});
        makeObservable(this);
    }

    clone(options?: ObservablePromiseOptions<PromiseMethod<T, M>>) {
        return new CallPromise<T, M>(this.api, this.method, {...this._options, ...options});
    }
}
