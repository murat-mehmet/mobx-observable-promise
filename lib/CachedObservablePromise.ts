import {makeObservable} from 'mobx';
import {ObservablePromise, ObservablePromiseOptions, PromiseAction, PromiseReturnType} from "./ObservablePromise";

/**
 * @deprecated Use ObservablePromise with `cached` option
 */
export class CachedObservablePromise<T extends PromiseAction> extends ObservablePromise<T> {
    constructor(action: T, options: ObservablePromiseOptions<T>)
    constructor(action: T, parser?: (result: any, callArgs: any[]) => PromiseReturnType<T>, name?: string)
    constructor(action: T, parserOrOptions?: ObservablePromiseOptions<T> | ((result: any, callArgs: any[]) => PromiseReturnType<T>), name?: string) {
        super(action, {
            cached: true,
            ...typeof parserOrOptions === 'function' ? {
                parser: parserOrOptions
            } : parserOrOptions as any
        }, name);
        makeObservable(this);
    }
}
