import {CallPromise, Methods, PromiseMethod} from "./CallPromise";
import {FetchPromise, FetchRequestInit, PromiseFetchAction} from "./FetchPromise";
import {InfiniteCallPromise} from "./InfiniteCallPromise";
import {InfiniteObservablePromise, PageResolver} from "./InfiniteObservablePromise";
import {ObservablePromise, ObservablePromiseOptions, PromiseAction} from "./ObservablePromise";

export function MOP<T extends PromiseAction>(action: T, options?: ObservablePromiseOptions<T>): ObservablePromise<T>
export function MOP<T, M extends keyof Methods<T>>(object: T, method: M, options?: ObservablePromiseOptions<PromiseMethod<T, M>>): CallPromise<T, M>
export function MOP(...args: [PromiseAction, object?] | [object, string, object?] | [object?, object?]): any {
    if (typeof args[0] === 'function') {
        // @ts-ignore
        return new ObservablePromise(...args);
    } else {
        // @ts-ignore
        return new CallPromise(...args)
    }
}

function infinite<T extends PromiseAction, TItem>(action: T, resolver: PageResolver<T, TItem>, options: ObservablePromiseOptions<T>): InfiniteObservablePromise<T, TItem>
function infinite<T, M extends keyof Methods<T>, TItem>(object: T, method: M, resolver: PageResolver<PromiseMethod<T, M>, TItem>, options: ObservablePromiseOptions<PromiseMethod<T, M>>): InfiniteCallPromise<T, M, TItem>
function infinite(...args: [PromiseAction, object, object?] | [object, string, object, object?]): any {
    if (typeof args[0] === 'function') {
        // @ts-ignore
        return new InfiniteObservablePromise(...args);
    } else {
        // @ts-ignore
        return new InfiniteCallPromise(...args);
    }
}

function fetch<TResult>(request?: {
    url: string,
    options?: FetchRequestInit
}, options?: ObservablePromiseOptions<PromiseFetchAction<TResult>>): FetchPromise<TResult> {
    return new FetchPromise(request, options);
}

MOP.infinite = infinite;
MOP.fetch = fetch;

MOP.configure = ObservablePromise.configure.bind(ObservablePromise) as typeof ObservablePromise.configure;
MOP.registerHook = ObservablePromise.registerHook.bind(ObservablePromise) as typeof ObservablePromise.registerHook;
MOP.hydrate = ObservablePromise.hydrate.bind(ObservablePromise) as typeof ObservablePromise.hydrate;
