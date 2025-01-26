import {makeObservable} from "mobx";
import {Methods, PromiseMethod} from "./CallPromise";
import {InfiniteObservablePromise, PageResolver} from "./InfiniteObservablePromise";
import {ObservablePromiseOptions, PromiseAction, PromiseReturnType} from "./ObservablePromise";

export class InfiniteCallPromise<T, M extends keyof Methods<T>, TItem> extends InfiniteObservablePromise<PromiseMethod<T, M>, TItem> {
    constructor(readonly object: T, readonly method: M, readonly resolver: PageResolver<PromiseMethod<T, M>, TItem>, options?: ObservablePromiseOptions<PromiseMethod<T, M>>) {
        super((object[method] as any).bind(object), resolver, {name: method.toString(), ...options});
        makeObservable(this);
    }

    clone(options?: ObservablePromiseOptions<PromiseMethod<T, M>>) {
        return new InfiniteCallPromise<T, M, TItem>(this.object, this.method, this.resolver, {...this._options, ...options});
    }
}
