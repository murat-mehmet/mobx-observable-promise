export class Logger {
    opts: Partial<LoggerOptions> = {
        level: LoggingLevel.none,
        withData: false,
        provider: console,
        limitArrays: 0,
        format: true
    }

    constructor(opts?: Partial<LoggerOptions>) {
        if (opts)
            this.opts = Object.assign(this.opts, opts);
    }

    log(level: LoggingLevel, text: string, data?: any) {
        if (this.opts.level >= level) {
            this.opts.provider.log(this.prefix(level) + text + (this.opts.withData && data != null ? (" [DATA] " + JSON.stringify(this.processData(data), null, this.opts.format ? 2 : null)) : ''));
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
        if (this.opts.limitArrays)
            data = JSON.parse(JSON.stringify(data));

        if (this.opts.limitArrays)
            this.doLimitArrays(data);

        return data;
    }

    private doLimitArrays(obj) {
        if (Array.isArray(obj) && obj.length > 0) {
            if (obj.length > this.opts.limitArrays) {
                const originalLength = obj.length;
                obj.splice(this.opts.limitArrays);
                const removedItemCount = originalLength - obj.length;
                obj.push(`[MOP] ${removedItemCount} more item${removedItemCount > 1 ? 's' : ''}`)
            }
            for (let i = 0; i < obj.length; i++) {
                if (obj[i])
                    this.doLimitArrays(obj[i])
            }
        } else if (typeof obj == 'object') {
            for (let key in obj) {
                if (obj.hasOwnProperty(key)) {
                    const element = obj[key];
                    if (element)
                        this.doLimitArrays(element);
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
    provider: {log: (...params) => any},
    limitArrays: number,
    format: boolean
}

export interface LoggerOptionsInput {
    level: keyof typeof LoggingLevel,
    withData: boolean,
    provider: {log: (...params) => any},
    limitArrays: number,
    format: boolean
}
