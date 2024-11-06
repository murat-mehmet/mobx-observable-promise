import {makeObservable} from "mobx";
import {CachedObservablePromise} from "./CachedObservablePromise";
import {Methods, PromiseMethod} from "./CallPromise";
import {ObservablePromiseOptions, PromiseAction, PromiseReturnType} from "./ObservablePromise";

export class CachedCallPromise<T, M extends keyof Methods<T>> extends CachedObservablePromise<PromiseMethod<T, M>> {
    constructor(api: T, method: M, options: ObservablePromiseOptions<PromiseMethod<T, M>>)
    constructor(api: T, method: M, parser?: (result: any, callArgs: any[]) => PromiseReturnType<T[M] extends PromiseAction ? (...callArgs: Parameters<T[M]>) => T[M] : never>, name?: string)
    constructor(readonly api: T, readonly method: M, parserOrOptions?: ObservablePromiseOptions<PromiseMethod<T, M>> | ((result: any, callArgs: any[]) => PromiseReturnType<T[M] extends PromiseAction ? (...callArgs: Parameters<T[M]>) => T[M] : never>), name?: string) {
        super((api[method] as any).bind(api), parserOrOptions as any, name || method.toString())
        makeObservable(this);
    }

    clone(options?: ObservablePromiseOptions<PromiseMethod<T, M>>) {
        return new CachedCallPromise<T, M>(this.api, this.method, {...this._options, ...options});
    }
}
