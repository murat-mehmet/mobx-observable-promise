import {LoggingLevel} from "./Logger";
import {ObservablePromise, ObservablePromiseOptions} from "./ObservablePromise";

export type PromiseFetchAction<TResult> = (url?: string, request?: FetchRequestInit) => Promise<TResult>;

export class FetchPromise<TResult> extends ObservablePromise<PromiseFetchAction<TResult>> {
    responseText: string;
    bodyParsed: any;
    status: number;

    constructor(readonly request?: {url: string, options?: FetchRequestInit}, options?: ObservablePromiseOptions<PromiseFetchAction<TResult>>) {
        super((async (url?: string, requestOptions?: FetchRequestInit) => {
            const {json, form, ...opts} = requestOptions || request.options;
            if (json) {
                if (!opts.headers)
                    opts.headers = {};
                opts.headers['content-type'] = 'application/json';
                if (opts.body)
                    opts.body = JSON.stringify(opts.body);
            } else if (form) {
                if (!opts.headers)
                    opts.headers = {};
                opts.headers['content-type'] = 'application/x-www-form-urlencoded';
                if (opts.body)
                    opts.body = toUrlEncoded(opts.body);
            }
            return await fetch((request.url || '') + url, opts as any).then(async response => {
                try {
                    this.responseText = await response.text();
                    this.bodyParsed = JSON.parse(this.responseText);
                } catch (e) {
                    console.warn(e);
                }
                this.status = response.status;

                if (this.status < 200 || this.status > 300) {
                    this.logger.log(LoggingLevel.error, `(${this._options.name}) Fetch error ${this.status} ${url}`, this.responseText);
                    throw new Error('Status ' + this.status);
                }

                return this.bodyParsed || this.responseText;
            })
        }) as any, options);
    }

    clone(options?: ObservablePromiseOptions<PromiseFetchAction<TResult>>) {
        return new FetchPromise<TResult>(this.request, {...this._options, ...options});
    }
}

interface _SourceUri {
    uri: string;

    [key: string]: any;
}

type BodyInit_ =
    | _SourceUri
    | Blob
    | Int8Array
    | Int16Array
    | Int32Array
    | Uint8Array
    | Uint16Array
    | Uint32Array
    | Uint8ClampedArray
    | Float32Array
    | Float64Array
    | DataView
    | ArrayBuffer
    | FormData
    | string
    | null;
type HeadersInit_ = Headers | string[][] | {[key: string]: string};
type RequestCredentials_ = 'omit' | 'same-origin' | 'include';
type RequestMode_ = 'navigate' | 'same-origin' | 'no-cors' | 'cors';

export interface FetchRequestInit {
    body?: BodyInit_;
    credentials?: RequestCredentials_;
    headers?: HeadersInit_;
    integrity?: string;
    keepalive?: boolean;
    method?: string;
    mode?: RequestMode_;
    referrer?: string;
    window?: any;
    signal?: AbortSignal;
    json?: boolean;
    form?: boolean;
}

const toUrlEncoded = (obj) =>
    Object.keys(obj)
        .map((k) => encodeURIComponent(k) + '=' + encodeURIComponent(obj[k]))
        .join('&');
