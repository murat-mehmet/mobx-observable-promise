import {action, computed, makeObservable, observable, runInAction, toJS} from "mobx";
import {Mutex} from "./async-mutex";
import {Logger, LoggerOptionsInput, LoggingLevel} from "./Logger";
import {ResetError} from "./ResetError";

export type PromiseReturnType<T extends (...args: any) => any> = T extends (...args: any) => Promise<infer R> ? R : any;
export type PromiseAction = (...args: any) => Promise<any>;

export class ObservablePromise<T extends PromiseAction> {
    static logger = new Logger();
    private static defaultOptions: ObservablePromiseDefaultOptions = {};
    private static hooks: PromiseHook[] = [];
    logger = new Logger({...ObservablePromise.logger.opts});
    @observable result: PromiseReturnType<T> = null;
    @observable error = null;
    @observable isExecuting = false;
    @observable isError = false;
    @observable wasExecuted = false;
    protected persistStore: {[key: string]: any};
    protected _mutex = new Mutex(new ResetError());
    protected _currentCall = null;
    protected _action: T;
    protected _options: ObservablePromiseOptions<T> = {...ObservablePromise.defaultOptions};
    private _instanceHooks: PromiseHook[] = [];

    constructor(action: T, options: ObservablePromiseOptions<T>)
    constructor(action: T, parser?: (result: any, callArgs: any[]) => PromiseReturnType<T>, name?: string)
    constructor(action: T, parserOrOptions?: ObservablePromiseOptions<T> | ((result: any, callArgs: any[]) => PromiseReturnType<T>), name?: string) {
        makeObservable(this);
        this._action = action;
        if (typeof parserOrOptions == 'object') {
            if (parserOrOptions) {
                const {logger: loggerOptions, ...parserOptions} = parserOrOptions;
                if (loggerOptions)
                    this.logger.setOptions(loggerOptions);
                this._options = Object.assign(this._options, parserOptions);
            }
            if (!this._options.name)
                this._options.name = name || getFuncName(action);

            if (this._options.delay) {
                let action = this._action;
                this._action = ((...args) => {
                    this.logger.log(LoggingLevel.verbose, `(${this._options.name}) Delay enabled, sleeping ${this._options.delay}ms`);
                    return sleep(this._options.delay).then(() => action(...args))
                }) as any;
            }
            if (this._options.fill) {
                let action = this._action;
                this._action = ((...args) => {
                    const start = Date.now();
                    return new Promise((res, rej) => action(...args).then(r => {
                        if (Date.now() - start < this._options.fill) {
                            const timeToSleep = this._options.fill - (Date.now() - start);
                            this.logger.log(LoggingLevel.verbose, `(${this._options.name}) Fill enabled, sleeping ${timeToSleep}ms`);
                            sleep(timeToSleep).then(() => res(r));
                        } else
                            res(r);
                    }).catch(e => {
                        if (Date.now() - start < this._options.fill) {
                            const timeToSleep = this._options.fill - (Date.now() - start);
                            this.logger.log(LoggingLevel.verbose, `(${this._options.name}) Fill enabled, sleeping ${timeToSleep}ms`);
                            sleep(timeToSleep).then(() => rej(e));
                        } else
                            rej(e);
                    }))
                }) as any;
            }
            if (this._options.timeout) {
                let action = this._action;
                this._action = ((...args) => {
                    return new Promise((res, rej) => {
                        let timedOut = false;
                        const timer = setTimeout(() => {
                            timedOut = true;
                            this.logger.log(LoggingLevel.verbose, `(${this._options.name}) Timeout enabled, throwing error`);
                            rej(new Error(this._options.timeoutMessage || 'Action timeout'));
                        }, this._options.timeout);
                        action(...args).then(r => {
                            if (!timedOut) {
                                clearTimeout(timer);
                                res(r);
                            }
                        }).catch(e => {
                            if (!timedOut) {
                                clearTimeout(timer);
                                rej(e);
                            }
                        })
                    })
                }) as any;
            }
        } else {
            this._options.parser = parserOrOptions;
            this._options.name = name || getFuncName(action);
        }
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

    static configure(parameters: {logger?: Partial<LoggerOptionsInput>} & ObservablePromiseDefaultOptions) {
        if (parameters) {
            const {logger, ...options} = parameters;
            if (parameters.logger)
                ObservablePromise.logger.setOptions(parameters.logger);
            if (options)
                ObservablePromise.defaultOptions = options;
        }
    }

    static registerHook(hook: (promise: ObservablePromise<any>) => any, name?: string) {
        name = name || getFuncName(hook, 'global_hook');
        ObservablePromise.hooks.push({action: hook, name});
        this.logger.log(LoggingLevel.verbose, `(Global) Registered hook [${name}]`);
    }

    static hydrate(persistStore: {[key: string]: any}, store: any)
    static hydrate(persistStore: {[key: string]: any}, ...promises: ObservablePromise<any>[])
    static hydrate(persistStore: {[key: string]: any}, ...promisesOrPromiseWrapper: any[]) {
        if (!promisesOrPromiseWrapper.length)
            throw new Error('You must enter promises or object of promises');
        runInAction(() => {
            if (promisesOrPromiseWrapper[0] instanceof ObservablePromise) {
                for (let i = 0; i < promisesOrPromiseWrapper.length; i++) {
                    let promise = promisesOrPromiseWrapper[i];
                    this.hydratePromise(promise, persistStore);
                }
            } else {
                for (let key in promisesOrPromiseWrapper[0]) {
                    if (promisesOrPromiseWrapper[0].hasOwnProperty(key)) {
                        const promise = promisesOrPromiseWrapper[0][key];
                        if (promise instanceof ObservablePromise) {
                            this.hydratePromise(promise, persistStore);
                        }
                    }
                }
            }
        })
    }

    private static hydratePromise(promise: ObservablePromise<any>, persistStore: {[p: string]: any}) {
        promise.persistStore = persistStore;

        const persistObject: PersistedObject = persistStore[promise._options.name];
        if (persistObject) {
            if (persistObject.expires && persistObject.expires < Date.now())
                delete persistStore[promise._options.name];
            else {
                promise.restoreResult(persistObject);
            }
        }
    }

    /**
     * @deprecated Use {@link getResult} and {@link getResultOf}
     * @param def
     */
    getResultOrDefault(def?: PromiseReturnType<T>): PromiseReturnType<T>;

    getResultOrDefault<R>(selector: (result: PromiseReturnType<T>) => R, def: R): R;

    getResultOrDefault(...args) {
        if (args.length <= 1) {
            return this.getResult(args[0]);
        } else {
            return this.getResultOf(args[0], args[1]);
        }
    }


    getResult(defaultValue?: (PromiseReturnType<T> | (() => PromiseReturnType<T>))): PromiseReturnType<T> {
        const {result} = this;
        if (!this.wasSuccessful)
            return typeof defaultValue == 'function' ? (defaultValue as any)() : defaultValue;
        return result;
    }

    getResultOf<R>(selector: (result: PromiseReturnType<T>) => R, defaultValue?: R | (() => R)): R {
        if (typeof selector != 'function')
            throw new Error(`selector must be a function but you entered ${typeof selector}`)
        const {result} = this;
        if (!this.wasSuccessful)
            return typeof defaultValue == 'function' ? (defaultValue as any)() : defaultValue;
        return selector(result);
    }

    registerHook(hook: (promise: ObservablePromise<T>) => any, name?: string) {
        name = name || getFuncName(hook, 'hook');
        this._instanceHooks.push({action: hook, name});
        this.logger.log(LoggingLevel.verbose, `(${this._options.name}) Registered hook [${name}]`);
        return () => this.unregisterHook(hook);
    }

    registerHookOnce(hook: (promise: ObservablePromise<T>) => any, name?: string) {
        const onceHook = (promise) => {
            this.unregisterHook(onceHook);
            hook(promise);
        };
        this.registerHook(onceHook, name);
        return () => this.unregisterHook(onceHook);
    }

    registerHookSuccess(hook: (promise: ObservablePromise<T>) => any, name?: string) {
        return this.registerHook((promise) => {
            if (this.wasSuccessful)
                hook(promise)
        }, name)
    }

    registerHookError(hook: (promise: ObservablePromise<T>) => any) {
        return this.registerHook((promise) => {
            if (this.isError)
                hook(promise)
        })
    }

    chain(promise: ObservablePromise<T>, name?: string) {
        return this.registerHook(() => {
            if (this.wasSuccessful)
                promise.resolve(this.result);
            else if (this.isError)
                promise.reject(this.error)
        }, name)
    }

    chainResolve(promise: ObservablePromise<T>, name?: string) {
        return this.registerHook(() => {
            if (this.wasSuccessful)
                promise.resolve(this.result);
        }, name)
    }

    chainReject(promise: ObservablePromise<T>, name?: string) {
        return this.registerHook(() => {
            if (this.isError)
                promise.reject(this.error)
        }, name)
    }

    chainReload(promise: ObservablePromise<any>, name?: string) {
        return this.registerHook(() => {
            if (this.wasSuccessful && promise.wasSuccessful)
                promise.reload().catch();
        }, name)
    }

    unregisterHook(hook: (promise: ObservablePromise<T>) => any) {
        this._instanceHooks = this._instanceHooks.filter(h => h.action != hook);
    }

    execute(...callArgs: Parameters<T>) {
        if (this._mutex.isLocked()) {
            if (!this._options.queued) {
                this.logger.log(LoggingLevel.info, `(${this._options.name}) Skipped execution, an execution is already in progress`, {args: callArgs});
                return this;
            } else
                this.logger.log(LoggingLevel.verbose, `(${this._options.name}) Added execution to queue`, {args: callArgs});
        }

        this._promise = this._mutex.runExclusive(() => new Promise((resolve, reject) => {
            this.logger.log(LoggingLevel.info, `(${this._options.name}) Begin execution`, {args: callArgs});

            runInAction(() => {
                this.isExecuting = true;
            });

            this._currentCall = {args: callArgs, result: null};
            this._action(...callArgs as any)
                .then((result) => {
                    if (result instanceof Error)
                        this.handleError(result, reject);
                    else {
                        if (this._options.parser) {
                            try {
                                this.logger.log(LoggingLevel.verbose, `(${this._options.name}) Parsing result`, result);
                                result = this._options.parser(result, callArgs);
                            } catch (e) {
                                result = e;
                                this.logger.log(LoggingLevel.error, `(${this._options.name}) Could not parse result (${e})`);
                            }
                            if (result instanceof Error) {
                                this.handleError(result, reject);
                                return result;
                            }
                        }

                        this.handleSuccess(result, resolve);
                    }
                })
                .catch((error) => {
                    this.handleError(error, reject);
                });
        }))

        return this;
    }

    reload() {
        if (!this._currentCall) {
            this.logger.log(LoggingLevel.error, `(${this._options.name}) Cannot reload non-executed promise`);
            return this;
        }
        this.logger.log(LoggingLevel.verbose, `(${this._options.name}) Re-executing with same parameters`);
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

    withArgs(...callArgs: Parameters<T> | []) {
        this.logger.log(LoggingLevel.verbose, `(${this._options.name} Settings args`, {args: callArgs});
        this._currentCall = {args: callArgs, result: null};
        return this;
    }

    resolve(result: PromiseReturnType<T>) {
        this.logger.log(LoggingLevel.verbose, `(${this._options.name}) Force resolving`);
        this.handleSuccess(result, null);
    }

    reject(error: Error) {
        this.logger.log(LoggingLevel.error, `(${this._options.name}) Force rejecting (${error})`);
        this.handleError(error, null);
    }

    /**
     * @deprecated use options.queued in constructor
     */
    queued(value = true) {
        this.logger.log(LoggingLevel.verbose, `(${this._options.name}) ${value ? 'Enabled' : 'Disabled'} queue`);
        this._options.queued = value;
        return this;
    }

    @action reset() {
        this.logger.log(LoggingLevel.verbose, `(${this._options.name}) Resetting`);
        this.result = null;
        this.isExecuting = false;
        this.isError = false;
        this.wasExecuted = false;
        if (this._mutex.isLocked())
            this._mutex.cancel();
        if (this.persistStore) {
            this.logger.log(LoggingLevel.verbose, `(${this._options.name}) Saving to store`);
            let persistObject = this.persistStore[this._options.name];
            if (!persistObject)
                persistObject = {};
            this.persistResult(persistObject);
        }

        return this;
    };

    clone(options?: ObservablePromiseOptions<T>) {
        return new ObservablePromise<T>(this._action, {...this._options, ...options});
    }

    @action
    protected handleSuccess(result, resolve?, skipPersist?) {
        this.logger.log(LoggingLevel.info, `(${this._options.name}) Execution was successful`, result);
        this.result = result;
        if (this._currentCall) this._currentCall.result = result;
        if (!skipPersist && this.persistStore) {
            this.logger.log(LoggingLevel.verbose, `(${this._options.name}) Saving result to store`);
            const persistObject: PersistedObject = {
                args: this._currentCall ? this._currentCall.args : null,
                data: result
            };
            if (this._options.expiresIn)
                persistObject.expires = Date.now() + this._options.expiresIn;
            this.persistResult(persistObject);
        }
        this.isExecuting = false;
        this.isError = false;
        this.wasExecuted = true;
        this.triggerHooks();
        resolve && resolve(this.result)
    }

    @action
    protected handleError(error, reject) {
        this.logger.log(LoggingLevel.error, `(${this._options.name}) Execution resulted with error (${error})`);
        this.error = error;
        this.isExecuting = false;
        this.isError = true;
        this.wasExecuted = true;
        this.triggerHooks();
        reject && reject(this.error);
    }

    @action
    protected persistResult(persistedObject: PersistedObject) {
        if (this.wasSuccessful) {
            persistedObject.args = this._currentCall ? this._currentCall.args : null;
            persistedObject.data = this.result;
        } else {
            delete persistedObject.args;
            delete persistedObject.data;
        }
        if (this._options.expiresIn)
            persistedObject.expires = Date.now() + this._options.expiresIn;
        this.persistStore[this._options.name] = persistedObject;
    }

    @action
    protected restoreResult(persistedObject: PersistedObject) {
        if (persistedObject.expires != null && persistedObject.expires < Date.now()) {
            this.reset();
            return false;
        }
        if (persistedObject.data != null) {
            this.result = toJS(persistedObject.data);
            this.wasExecuted = true;
        }
        if (persistedObject.args != null)
            this._currentCall = {
                args: toJS(persistedObject.args),
                result: this.result
            }
        return true;
    }

    private triggerHooks() {
        this._instanceHooks.forEach(hook => {
            this.logger.log(LoggingLevel.verbose, `(${this._options.name}) Triggering instance hook [${hook.name}]`);
            hook.action(this);
        });
        ObservablePromise.hooks.forEach(hook => {
            this.logger.log(LoggingLevel.verbose, `(${this._options.name}) Triggering global [${hook.name}]`);
            hook.action(this);
        });
    }
}

function getFuncName(func, defaultPrefix = 'func') {
    const result = /^function\s+([\w\$]+)\s*\(/.exec(func.toString())
    return (result ? result[1] : defaultPrefix) + '_' + Math.random().toString(36).substring(7)
}

export interface ObservablePromiseOptions<T extends PromiseAction> {
    name?: string;
    parser?: (result: any, callArgs: any[]) => PromiseReturnType<T>;
    queued?: boolean;
    delay?: number;
    fill?: number;
    timeout?: number;
    timeoutMessage?: string;
    expiresIn?: number;
    logger?: Partial<LoggerOptionsInput>
}

export interface ObservablePromiseDefaultOptions {
    queued?: boolean;
    delay?: number;
    fill?: number;
    timeout?: number;
    timeoutMessage?: string;
}

export interface PersistedObject {
    args: any[],
    data: any,
    expires?: number
}

export interface PromiseHook {
    action: (promise: ObservablePromise<any>) => any,
    name?: string
}

const sleep = (time) => new Promise((res) => setTimeout(res, time));
