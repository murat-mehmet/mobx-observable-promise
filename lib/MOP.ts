import {CallPromise, Methods, PromiseMethod} from "./CallPromise";
import {FetchPromise, FetchRequestInit, PromiseFetchAction} from "./FetchPromise";
import {InfiniteCallPromise} from "./InfiniteCallPromise";
import {InfiniteObservablePromise, PageResolver} from "./InfiniteObservablePromise";
import {ObservablePromise, ObservablePromiseOptions, PromiseAction} from "./ObservablePromise";

export function MOP<T extends PromiseAction>(action: T, options?: ObservablePromiseOptions<T>): ObservablePromise<T>
export function MOP<T, M extends keyof Methods<T>>(object: T, method: M, options?: ObservablePromiseOptions<PromiseMethod<T, M>>): CallPromise<T, M>
export function MOP<T extends PromiseAction, TItem>(action: T, options: {
    resolver: PageResolver<T, TItem>
} & ObservablePromiseOptions<T>): InfiniteObservablePromise<T, TItem>
export function MOP<T, M extends keyof Methods<T>, TItem>(object: T, method: M, options: {
    resolver: PageResolver<PromiseMethod<T, M>, TItem>
} & ObservablePromiseOptions<PromiseMethod<T, M>>): InfiniteCallPromise<T, M, TItem>
export function MOP<TResult>(request?: {
    url: string,
    options?: FetchRequestInit
}, options?: ObservablePromiseOptions<PromiseFetchAction<TResult>>): FetchPromise<TResult>
export function MOP(...args: [PromiseAction, object?] | [object, string, object?] | [object?, object?]): any {
    if (typeof args[0] === 'function') {
        // action promise type
        const actionArgs = args as [PromiseAction, object?];
        if (actionArgs[1] && 'resolver' in actionArgs[1]) {
            const {resolver, ...options} = actionArgs[1];
            return new InfiniteObservablePromise(actionArgs[0], resolver as any, options);
        } else {
            return new ObservablePromise(actionArgs[0], actionArgs[1]);
        }
    } else {
        if (!args[0] || (typeof args[1] !== 'string')) {
            return new FetchPromise(args[0] as any, args[1] as any)
        }
        // call promise type
        const actionArgs = args as [object, string, object?];
        if (actionArgs[2] && 'resolver' in actionArgs[2]) {
            const {resolver, ...options} = actionArgs[2];
            return new InfiniteCallPromise(actionArgs[0], actionArgs[1] as never, resolver as any, options);
        } else {
            return new CallPromise(actionArgs[0], actionArgs[1] as never)
        }
    }
}

MOP.configure = ObservablePromise.configure.bind(ObservablePromise) as typeof ObservablePromise.configure;
MOP.registerHook = ObservablePromise.registerHook.bind(ObservablePromise) as typeof ObservablePromise.registerHook;
MOP.hydrate = ObservablePromise.hydrate.bind(ObservablePromise) as typeof ObservablePromise.hydrate;
