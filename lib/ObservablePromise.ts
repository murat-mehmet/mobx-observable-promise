import {action, computed, observable, runInAction} from "mobx";

export type PromiseReturnType<T extends (...args: any) => any> = T extends (...args: any) => Promise<infer R> ? R : any;
export type PromiseAction = (...args: any) => Promise<any>;

export class ObservablePromise<T extends PromiseAction> {
    static _hooks = [];
    _instanceHooks = [];
    @observable result: PromiseReturnType<T> = null;
    @observable error = null;
    @observable isExecuting = false;
    @observable isError = false;
    @observable wasExecuted = false;
    protected _isWaitingForResponse = false;
    protected _currentCall = null;
    protected _action: T;
    protected _parser: (result: any, callArgs: any[]) => PromiseReturnType<T>;

    constructor(action: T, parser?: (result: any, callArgs: any[]) => PromiseReturnType<T>, readonly name?: string) {
        this._action = action;
        this._parser = parser;
    }

    protected _promise: Promise<PromiseReturnType<T>>;

    get promise(): Promise<PromiseReturnType<T>> {
        return this._promise;
    }

    get args() {
        return this._currentCall
            ? this._currentCall.args
            : [];
    }

    @computed get isExecutingFirstTime() {
        return !this.wasExecuted && this.isExecuting;
    }

    @computed get wasExecutedSuccessfully() {
        return this.wasExecuted && !this.isError;
    }

    static registerHook(hook) {
        ObservablePromise._hooks.push(hook);
    }

    registerHook(hook) {
        this._instanceHooks.push(hook);
    }

    unregisterHook(hook) {
        this._instanceHooks = this._instanceHooks.filter(h => h != hook);
    }

    execute(...callArgs: Parameters<T>) {
        if (this._isWaitingForResponse) return this;

        runInAction(() => {
            this.isExecuting = true;
        });

        this._promise = new Promise((resolve, reject) => {
            this._action(...callArgs as any)
                .then((result) => {
                    if (result instanceof Error)
                        this.handleError(result, reject);
                    else {
                        if (this._parser) {
                            try {
                                result = this._parser(result, callArgs);
                            } catch (e) {
                                result = e;
                            }
                            if (result instanceof Error) {
                                this.handleError(result, reject);
                                return result;
                            }
                        }

                        this.handleSuccess(result, resolve);
                    }
                    return result;
                })
                .catch((error) => {
                    this.handleError(error, reject);
                });
        });

        this._isWaitingForResponse = true;
        this._currentCall = {args: callArgs, result: null};
        return this;
    }

    reload() {
        return this.execute(...this._currentCall.args);
    }

    retry = () => this.reload();

    then<TThen>(onResolved?: (value: PromiseReturnType<T>) => TThen | void) {
        if (!this._promise) throw new Error('You have to call Request::execute before you can access it as promise');
        return this._promise.then(onResolved);
    }

    catch<TThen>(onRejected: (reason: Error) => TThen | void = e => null) {
        if (!this._promise) throw new Error('You have to call Request::execute before you can access it as promise');
        return this._promise.catch(onRejected);
    }

    _triggerHooks() {
        this._instanceHooks.forEach(hook => hook(this));
        ObservablePromise._hooks.forEach(hook => hook(this));
    }

    @action reset() {
        this.result = null;
        this.isExecuting = false;
        this.isError = false;
        this.wasExecuted = false;
        this._isWaitingForResponse = false;
        this._promise = null;

        return this;
    };

    @action
    protected handleSuccess(result, resolve) {
        this.result = result;
        if (this._currentCall) this._currentCall.result = result;
        this.isExecuting = false;
        this.isError = false;
        this.wasExecuted = true;
        this._isWaitingForResponse = false;
        this._triggerHooks();
        resolve && resolve(result)
    }

    @action
    protected handleError(error, reject) {
        this.error = error;
        this.isExecuting = false;
        this.isError = true;
        this.wasExecuted = true;
        this._isWaitingForResponse = false;
        this._triggerHooks();
        reject(error);
    }
}