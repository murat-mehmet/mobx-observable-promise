import {ObservablePromise, ObservablePromiseOptions, PromiseAction, PromiseReturnType} from "./ObservablePromise";

export type Methods<T> = Pick<T, {
    [K in keyof T]: T[K] extends PromiseAction ? K : never
}[keyof T]>;

export class CallPromise<T, M extends keyof Methods<T>> extends ObservablePromise<T[M] extends PromiseAction ? (...callArgs: Parameters<T[M]>) => Promise<T[M] extends (...args: any) => Promise<infer R> ? R : any> : never> {
    constructor(api: T, method: M, options: ObservablePromiseOptions<T[M] extends PromiseAction ? (...callArgs: Parameters<T[M]>) => Promise<T[M] extends (...args: any) => Promise<infer R> ? R : any> : never>)
    constructor(api: T, method: M, parser?: (result: any, callArgs: any[]) => T[M] extends PromiseAction ? PromiseReturnType<T[M]> : never, name?: string)
    constructor(readonly api: T, readonly method: M, parserOrOptions?: ObservablePromiseOptions<T[M] extends PromiseAction ? (...callArgs: Parameters<T[M]>) => Promise<T[M] extends (...args: any) => Promise<infer R> ? R : any> : never> | ((result: any, callArgs: any[]) => T[M] extends PromiseAction ? PromiseReturnType<T[M]> : never), name?: string) {
        super((api[method] as any).bind(api), parserOrOptions as any, name || method.toString());
    }

    clone(options?: ObservablePromiseOptions<T[M] extends PromiseAction ? (...callArgs: Parameters<T[M]>) => Promise<T[M] extends (...args: any) => Promise<infer R> ? R : any> : never>) {
        return new CallPromise<T, M>(this.api, this.method, {...this._options, ...options});
    }
}
