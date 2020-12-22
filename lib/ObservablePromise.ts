import {action, computed, observable, runInAction} from "mobx";
import {Logger, LoggingLevel} from "./Logger";

export type PromiseReturnType<T extends (...args: any) => any> = T extends (...args: any) => Promise<infer R> ? R : any;
export type PromiseAction = (...args: any) => Promise<any>;

export class ObservablePromise<T extends PromiseAction> {
    static logger = new Logger();
    private static hooks = [];
    logger = new Logger(ObservablePromise.logger.opts);
    @observable result: PromiseReturnType<T> = null;
    @observable error = null;
    @observable isExecuting = false;
    @observable isError = false;
    @observable wasExecuted = false;
    protected _isWaitingForResponse = false;
    protected _currentCall = null;
    protected _action: T;
    protected _parser: (result: any, callArgs: any[]) => PromiseReturnType<T>;
    protected _queued = null;
    private _instanceHooks = [];

    constructor(action: T, parser?: (result: any, callArgs: any[]) => PromiseReturnType<T>, readonly name?: string) {
        this._action = action;
        this._parser = parser;
        if (!name)
            this.name = getFuncName(action);
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

    /**
     * @deprecated use {@link wasSuccessful}
     */
    @computed get wasExecutedSuccessfully() {
        return this.wasSuccessful;
    }

    @computed get wasSuccessful() {
        return this.wasExecuted && !this.isError;
    }

    static registerHook(hook) {
        ObservablePromise.hooks.push(hook);
        this.logger.log(LoggingLevel.verbose, `(Global) Registered hook #${ObservablePromise.hooks.length}`);
    }

    getResultOrDefault(def: PromiseReturnType<T>): PromiseReturnType<T>;
    getResultOrDefault<R>(selector: (result: PromiseReturnType<T>) => R, def: R): R;
    getResultOrDefault(...args) {
        if (args.length == 1) {
            if (!this.wasSuccessful)
                return args[0];
            return this.result;
        } else {
            if (!this.wasSuccessful)
                return args[1];
            return args[0](this.result);
        }
    }

    registerHook(hook: (promise: ObservablePromise<T>) => any) {
        this._instanceHooks.push(hook);
        this.logger.log(LoggingLevel.verbose, `(${this.name}) Registered hook #${this._instanceHooks.length}`);
        return () => this.unregisterHook(hook);
    }

    registerHookOnce(hook: (promise: ObservablePromise<T>) => any) {
        const onceHook = (promise) => {
            this.unregisterHook(onceHook);
            hook(promise);
        };
        this.registerHook(onceHook);
        return () => this.unregisterHook(onceHook);
    }

    chain(promise: ObservablePromise<T>) {
        return this.registerHook(() => {
            if (this.wasSuccessful)
                promise.resolve(this.result);
            else if (this.isError)
                promise.reject(this.error)
        })
    }

    chainResolve(promise: ObservablePromise<T>) {
        return this.registerHook(() => {
            if (this.wasSuccessful)
                promise.resolve(this.result);
        })
    }

    chainReject(promise: ObservablePromise<T>) {
        return this.registerHook(() => {
            if (this.isError)
                promise.reject(this.error)
        })
    }

    chainReload(promise: ObservablePromise<any>) {
        return this.registerHook(() => {
            if (this.wasSuccessful && promise.wasSuccessful)
                promise.reload().catch();
        })
    }

    unregisterHook(hook: (promise: ObservablePromise<T>) => any) {
        this._instanceHooks = this._instanceHooks.filter(h => h != hook);
    }

    execute(...callArgs: Parameters<T>) {
        if (this._isWaitingForResponse) {
            if (this._queued) {
                this.logger.log(LoggingLevel.verbose, `(${this.name}) Added execution to queue`);
                this._promise = this._promise.finally(() => this.execute(...callArgs));
            } else {
                this.logger.log(LoggingLevel.info, `(${this.name}) Skipped execution, an execution is already in progress`, {args: callArgs});
            }
            return this;
        }
        this.logger.log(LoggingLevel.verbose, `(${this.name}) Begin execution`, {args: callArgs});

        runInAction(() => {
            this.isExecuting = true;
        });

        this._isWaitingForResponse = true;
        this._currentCall = {args: callArgs, result: null};

        this._promise = new Promise((resolve, reject) => {
            this._action(...callArgs as any)
                .then((result) => {
                    if (result instanceof Error)
                        this.handleError(result, reject);
                    else {
                        if (this._parser) {
                            try {
                                result = this._parser(result, callArgs);
                                this.logger.log(LoggingLevel.verbose, `(${this.name}) Parsed result`);
                            } catch (e) {
                                result = e;
                                this.logger.log(LoggingLevel.error, `(${this.name}) Could not parse result (${e})`);
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

        return this;
    }

    reload() {
        this.logger.log(LoggingLevel.verbose, `(${this.name}) Re-executing with same parameters`);
        return this.execute(...this._currentCall.args);
    }

    retry = () => this.reload();

    then<TThen>(onResolved?: (value: PromiseReturnType<T>) => TThen) {
        if (!this._promise) throw new Error('You have to run an execution before you can access it as promise');
        return this._promise.then(onResolved);
    }

    catch<TThen>(onRejected: (reason: Error) => TThen = e => null) {
        if (!this._promise) throw new Error('You have to run an execution before you can access it as promise');
        return this._promise.catch(onRejected);
    }

    resolve(result: PromiseReturnType<T>) {
        this.logger.log(LoggingLevel.verbose, `(${this.name}) Force resolving`);
        this.handleSuccess(result, null);
    }

    reject(error: Error) {
        this.logger.log(LoggingLevel.error, `(${this.name}) Force rejecting (${error})`);
        this.handleError(error, null);
    }

    queued(value = true) {
        this.logger.log(LoggingLevel.verbose, `(${this.name}) ${value ? 'Enabled' : 'Disabled'} queue`);
        this._queued = value;
        return this;
    }

    @action reset() {
        this.logger.log(LoggingLevel.verbose, `(${this.name}) Resetting`);
        this.result = null;
        this.isExecuting = false;
        this.isError = false;
        this.wasExecuted = false;
        this._isWaitingForResponse = false;
        this._promise = null;

        return this;
    };

    clone() {
        return new ObservablePromise<T>(this._action, this._parser, this.name);
    }

    @action
    protected handleSuccess(result, resolve?) {
        this.logger.log(LoggingLevel.info, `(${this.name}) Execution was successful`, result);
        this.result = result;
        if (this._currentCall) this._currentCall.result = result;
        this.isExecuting = false;
        this.isError = false;
        this.wasExecuted = true;
        this._isWaitingForResponse = false;
        this.triggerHooks();
        resolve && resolve(result)
    }

    @action
    protected handleError(error, reject) {
        this.logger.log(LoggingLevel.error, `(${this.name}) Execution resulted with error (${error})`);
        this.error = error;
        this.isExecuting = false;
        this.isError = true;
        this.wasExecuted = true;
        this._isWaitingForResponse = false;
        this.triggerHooks();
        reject && reject(error);
    }

    private triggerHooks() {
        this.logger.log(LoggingLevel.verbose, `(${this.name}) Triggering ${this._instanceHooks.length} instance and ${ObservablePromise.hooks.length} global hooks`);
        this._instanceHooks.forEach(hook => hook(this));
        ObservablePromise.hooks.forEach(hook => hook(this));
    }
}

function getFuncName(func) {
    const result = /^function\s+([\w\$]+)\s*\(/.exec(func.toString())
    return (result ? result[1] : 'func') + '_' + Math.random().toString(36).substring(7)
}
