import {useRef} from 'react';
import {CallPromise, Methods, PromiseMethod} from "../CallPromise";
import {FetchRequestInit, PromiseFetchAction} from "../FetchPromise";
import {InfiniteCallPromise} from "../InfiniteCallPromise";
import {InfiniteObservablePromise, PageResolver} from "../InfiniteObservablePromise";
import {MOP} from "../MOP";
import {ObservablePromise, ObservablePromiseOptions, PromiseAction} from "../ObservablePromise";

export function useMOP<T extends PromiseAction>(action: T, options?: ObservablePromiseOptions<T>): ObservablePromise<T>
export function useMOP<T, M extends keyof Methods<T>>(object: T, method: M, options?: ObservablePromiseOptions<PromiseMethod<T, M>>): CallPromise<T, M>
export function useMOP(...args: any[]) {
    const ref = useRef<any>(null);
    if (!ref.current) {
        // @ts-ignore
        ref.current = MOP(...args);
    }
    return ref.current.v;
}

export function useInfiniteMOP<T extends PromiseAction, TItem>(action: T, options: {
    resolver: PageResolver<T, TItem>
} & ObservablePromiseOptions<T>): InfiniteObservablePromise<T, TItem>
export function useInfiniteMOP<T, M extends keyof Methods<T>, TItem>(object: T, method: M, options: {
    resolver: PageResolver<PromiseMethod<T, M>, TItem>
} & ObservablePromiseOptions<PromiseMethod<T, M>>): InfiniteCallPromise<T, M, TItem>
export function useInfiniteMOP(...args: any[]) {
    const ref = useRef<any>(null);
    if (!ref.current) {
        // @ts-ignore
        ref.current = MOP.infinite(...args);
    }
    return ref.current.v;
}

export function useFetchMOP<TResult>(request?: {
    url: string,
    options?: FetchRequestInit
}, options?: ObservablePromiseOptions<PromiseFetchAction<TResult>>) {
    const ref = useRef<any>(null);
    if (!ref.current) {
        ref.current = MOP.fetch(request, options);
    }
    return ref.current.v;
}
