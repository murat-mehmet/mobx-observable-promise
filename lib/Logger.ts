export class Logger {
    opts: Partial<LoggerOptions> = {
        level: LoggingLevel.none,
        withData: false,
        provider: console,
        limitArrays: 0,
        limitStrings: 0,
        format: true
    }

    constructor(opts?: Partial<LoggerOptions>) {
        if (opts)
            this.opts = Object.assign(this.opts, opts);
    }

    log(level: LoggingLevel, text: string, data?: any) {
        if (this.opts.level >= level) {
            let method;
            switch (level) {
                case LoggingLevel.error:
                    method = 'error';
                    break;
                case LoggingLevel.info:
                    method = 'log';
                    break;
                case LoggingLevel.verbose:
                    method = 'debug';
                    break;
            }
            if (method)
                this.opts.provider[method](this.prefix(level) + text + (this.opts.withData && data != null ? (" [DATA] " + JSON.stringify(this.processData(data), null, this.opts.format ? 2 : null)) : ''));
        }
    }

    setLevel(level: keyof typeof LoggingLevel) {
        this.opts.level = LoggingLevel[level];
        return this;
    }

    setWithData(value = true) {
        this.opts.withData = value;
        return this;
    }

    setOptions(opts: Partial<LoggerOptionsInput>) {
        this.opts = Object.assign(this.opts, opts);
        if (opts.level)
            this.opts.level = LoggingLevel[opts.level];
        return this;
    }

    private prefix(level: LoggingLevel) {
        let levelText;
        switch (level) {
            case LoggingLevel.error:
                levelText = 'ERROR';
                break;
            case LoggingLevel.info:
                levelText = 'INFO'
                break;
            case LoggingLevel.verbose:
                levelText = 'VERBOSE'
                break;

        }
        return `[MOP] [${levelText}] `;
    }

    private processData(data) {
        if (this.opts.limitArrays || this.opts.limitStrings) {
            data = JSON.parse(JSON.stringify(data));
            this.doLimitObject(data);
        }

        return data;
    }

    private doLimitObject(obj) {
        if (Array.isArray(obj) && obj.length > 0) {
            if (this.opts.limitArrays) {
                if (obj.length > this.opts.limitArrays) {
                    const originalLength = obj.length;
                    obj.splice(this.opts.limitArrays);
                    const removedItemCount = originalLength - obj.length;
                    obj.push(`[MOP] ${removedItemCount} more item${removedItemCount > 1 ? 's' : ''}`)
                }
            }
            for (let i = 0; i < obj.length; i++) {
                const element = obj[i];
                if (element) {
                    if (this.opts.limitStrings) {
                        if (typeof element == 'string' && element.length > this.opts.limitStrings) {
                            const originalLength = element.length;
                            obj[i] = element.substring(0, this.opts.limitStrings);
                            const removedItemCount = originalLength - obj[i].length;
                            obj[i] += `... [MOP] ${removedItemCount} more char${removedItemCount > 1 ? 's' : ''}`
                        }
                    }
                    this.doLimitObject(obj[i])
                }
            }
        } else if (typeof obj == 'object') {
            for (let key in obj) {
                if (obj.hasOwnProperty(key)) {
                    const element = obj[key];
                    if (element) {
                        if (this.opts.limitStrings) {
                            if (typeof element == 'string' && element.length > this.opts.limitStrings) {
                                const originalLength = element.length;
                                obj[key] = element.substring(0, this.opts.limitStrings);
                                const removedItemCount = originalLength - obj[key].length;
                                obj[key] += `... [MOP] ${removedItemCount} more char${removedItemCount > 1 ? 's' : ''}`
                            }
                        }
                        this.doLimitObject(obj[key]);
                    }
                }
            }
        }
    }
}

export enum LoggingLevel {
    none = 0,
    error = 1,
    info = 2,
    verbose = 3,
}

export interface LoggerOptions {
    level: LoggingLevel,
    withData: boolean,
    provider: {
        log: (...params) => any,
        debug: (...params) => any,
        error: (...params) => any,
    },
    limitArrays: number,
    limitStrings: number,
    format: boolean
}

export interface LoggerOptionsInput {
    level: keyof typeof LoggingLevel,
    withData: boolean,
    provider: {
        log: (...params) => any,
        debug: (...params) => any,
        error: (...params) => any,
    },
    limitArrays: number,
    limitStrings: number,
    format: boolean
}
