# MobX Observable Promise

*Promise implementation for mobx stores.*

`mobx-observable-promise` is a MobX-based utility library that wraps promises into observable states. It provides a powerful mechanism to track the
state of an asynchronous action and handle loading, success, and error states in a React application.

## Features

- **Observable Status Tracking:** Monitor the execution state of promises with observable properties.
- **Simplified Asynchronous Handling:** Reduce boilerplate code when dealing with API calls and other asynchronous operations.
- **Integration with React Components:** Seamlessly incorporate observable promises into React components for efficient state management.

## Installation

```sh
npm install mobx-observable-promise --save
```

or

```sh
yarn add mobx-observable-promise
```

## Usage

#### Class Store

```typescript
import {computed, makeObservable, observable} from "mobx"
import MOP from 'mobx-observable-promise';

class TodoList {
    todoCall = MOP(() => fetchSomeData()); // <-- define a promise call with MOP

    constructor() {
        makeObservable(this, {
            todoCall: observable,
        })
    }
}

const store = new TodoList();
```

#### Functional Store

```typescript
import {makeAutoObservable} from "mobx"
import MOP from 'mobx-observable-promise';

function createTodoList() {
    return makeAutoObservable({
        todoCall: MOP(() => fetchSomeData()),
    })
}

const store = createTodoList();
```

#### Usage in a component

```typescript jsx
const TodoView = observer(() => {
    const {todoCall} = store;
    return (
        <div>
            <button onClick={() => todoCall.execute()} value="fetch" />
            {todoCall.getResult().map(item => (
                <TodoItem item={item} />
            ))}
            {todoCall.isExecuting && (
                <Loader />
            )}
            {todoCall.hasError && (
                <Alert message={todoCall.error.message} />
            )}
        </div>
    );
})
```

## API Reference

`MOP` currently has support for 3 types of promises.

- **Observable Promise:** Regular promises that can be observed by components.
- **Infinite Observable Promise:** Observable Promises that support pagination.
- **Fetch Promise:** A shorthand for specific promises that only do fetch calls.

### Observable Promise

To define an observable promise, wrap a promise with `MOP()`.

#### Basic example:

```typescript jsx
import MOP from "mobx-observable-promise";

// Create a sample async function
const fetchData = async () => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve("Data fetched!");
        }, 2000);
    });
};

// Create an ObservablePromise instance
const fetchCall = MOP(fetchData); // or new ObservablePromise(fetchData)

// Access the observable states
console.log(fetchCall.result); // null (initially)
console.log(fetchCall.isExecuting); // false (initially)

// Execute the promise
fetchCall.execute().then(() => {
    console.log(fetchCall.result); // "Data fetched!" (on success)
    console.log(fetchCall.wasSuccessful); // true (on success)
});

```

You may want to wrap a specific method from an API or service into an observable promise by using the following override.

```typescript jsx
import MOP from "mobx-observable-promise";

// Define an API service with a method that returns a promise
const apiService = {
    fetchData: async (id: number) => {
        const response = await fetch(`https://api.example.com/data/${id}`);
        return response.json();
    },
};

// Create an ObservablePromise instance
const fetchCall = MOP(apiService, "fetchData"); // or new CallPromise(apiService, "fetchData")


```

#### Options

`ObservablePromise` accepts an optional `options` object to customize the behavior:

```typescript jsx
const fetchCall = MOP(fetchData, {
    name: "Fetch Call", // Name to identify this observable promise
    queued: true,        // Enable queuing of subsequent executions if a promise is already executing, default is false which will skip subsequent executions
    cached: true,       // Cache the result
    parser: (result) => result.data, // A custom parser for the result
});
```

| Option         | Type          | Description                                                                                                                       |
|----------------|---------------|-----------------------------------------------------------------------------------------------------------------------------------|
| name           | string        | Name to identify this observable promise                                                                                          |
| parser         | function      | A custom parser for the result                                                                                                    |
| queued         | boolean       | Enable queuing of subsequent executions if a promise is already executing, default is false which will skip subsequent executions |
| cached         | boolean       | Cache the result                                                                                                                  |
| expiresIn      | number        | Duration to expire the cached result                                                                                              |
| delay          | number        | Delay the execution by milliseconds                                                                                               |
| fill           | number        | Fill the execution time by milliseconds                                                                                           |
| timeout        | number        | Throw an exception if execution takes too long                                                                                    |
| timeoutMessage | string        | A custom message for timeout exception                                                                                            |
| logger         | LoggerOptions | Custom logger options                                                                                                             |

#### Observable Fields

The following fields are marked as observable and you can use them in your observer components

| Property    | Type    | Description                                                                                                   |
|-------------|---------|---------------------------------------------------------------------------------------------------------------|
| result      | any     | Resolved result object of the underlying promise                                                              |
| error       | any     | Error object, in case the promise is rejected                                                                 |
| isExecuting | boolean | Returns true while the promise is getting executed                                                            |
| hasError    | boolean | Returns true if the last execution of promise was rejected, check `error` field for the resulted error object |
| wasExecuted | boolean | Returns true if the promise is executed at least once                                                         |

#### Computed Fields

The following fields are computed readonly properties. You can use them in your observer components but you cannot modify them directly.

| Property             | Type    | Description                                                                                                           |
|----------------------|---------|-----------------------------------------------------------------------------------------------------------------------|
| isExecutingFirstTime | boolean | Returns true while the promise is getting executed for the first time                                                 |
| wasSuccessful        | boolean | Returns true if the last execution of promise was resolved successfully, check `result` field for the resulted object |

#### Other Fields

The following fields are readonly non-observable properties.

| Property | Type    | Description                                                                        |
|----------|---------|------------------------------------------------------------------------------------|
| promise  | Promise | Returns the underlying promise which the action is executing / was executed lastly |
| args     | any[]   | Returns the arguments which the `execute` was called lastly                        |

#### Methods

#### `execute(...callArgs)`

Executes the actual promise which was given in constructor as action parameter. The arguments are passed directly to the action.

##### Example

```js
searchCall = MOP((keyword) => fetch('/search?q=' + keyword));

searchCall.execute('some-keyword');
```

#### `getResult(default)`

If the promise was executed successfully, returns the result field, else returns `default` parameter of this function

##### Example

```js
const list = todoCall.getResult([]);
// which is same as
let list;
if (todoCall.wasSuccessful)
  list = todoCall.result;
else
  list = [];
```

#### `getResultOf(selector, default)`

If the promise was executed successfully, returns the result field using the selector function, else returns `default` parameter of this function

##### Example

```js
const list = todoCall.getResultOf(result => result.data, []);
// which is same as
let list;
if (todoCall.wasSuccessful)
  list = todoCall.result.data;
else
  list = [];
```

#### `reload()`

Re-executes the promise with last called arguments

#### `reset()`

Resets promise as it was never executed.

#### `then(onResolved)`

Calls and returns the `then` method of promise with `onResolved` parameter

##### Example

```js
todoCall.execute('some-keyword').then(console.log)
// which is same as
todoCall.execute('some-keyword');
todoCall.promise.then(console.log);
```

#### `catch(onRejected)`

Calls and returns the `catch` method of promise with `onRejected` parameter

##### Example

```js
todoCall.execute('some-keyword').catch(console.warn)
// which is same as
todoCall.execute('some-keyword');
todoCall.promise.catch(console.warn);
```

#### `finally(onFinally)`

Calls and returns the `finallt` method of promise with `onFinally` parameter

#### `resolve(result)`

This method can be used to directly set result without actually executing the promise

#### `reject(result)`

This method can be used to directly set error without actually executing the promise

#### `withArgs(...callArgs)`

Sets call args of the current call. Useful when used with `resolve` or `reject` in a cached promise so args are cached correctly along with the
result.

#### `resetCache()`

Clears all cache.

#### `resetCache(...callArgs)`

Clears cache for given args.

#### `isCached(...callArgs)`

Checks if a call is cached for given args.

#### `wasExecutedWith(...callArgs)`

Checks if the last call was made with given args.

#### `registerHook(promise => {})`

You can register a function which will be called after every promise execution. You should check if promise was executed successfully or rejected with
an error.

You can create a generic error reporter here, or chain promises after one another.

#### `registerHookOnce(promise => {})`

You can register a function which will be called once after an execution.

#### `registerHookSuccess(promise => {})`

You can register a function which will be called after every successful promise execution.

#### `registerHookError(promise => {})`

You can register a function which will be called after every rejected promise execution.

#### `unregisterHook(hook)`

Unregisters the hook given in `registerHook`

#### `chain(promise)`

Chain the results with the specified promise. After executing this promise, any result will be passed to the specified promise. Note that `chain`
methods use `registerHook` under the hood so you can call the returned function to unchain the promise.

```js
const unchain = todoSearchCall.chain(todoCall);
// later if you need
unchain();
```

#### `chainResolve(promise)`

Chain the result with the specified promise. After executing this promise, only successful result will be passed to the specified promise.

#### `chainReject(promise)`

Chain the error with the specified promise. After executing this promise, only error will be passed to the specified promise.

#### `chainReload(promise)`

Chain the specified promise to reload after a successful resolve.

#### `clone(options?)`

Creates a new observable promise with the same action and options. You can override options.

### Infinite Observable Promise

This is useful when dealing with APIs that return paginated results. It manages the state of the promise and provides the following features

```typescript jsx
import MOP from "mobx-observable-promise";

// Define an async action for fetching paginated data
const fetchData = async (page: number) => {
    const response = await fetch(`https://api.example.com/items?page=${page}`);
    return response.json();
};

// Create an InfiniteObservablePromise instance
const fetchCall = MOP.infinite(fetchData, {
    resolve: (result) => result.items, // Extract items from the response
    nextArgs: (result, prevArgs, next) => next(prevArgs[0] + 1), // Get next page number
    hasMore: (result) => result.hasMore, // Optional, check if there are more items to fetch
    totalCount: (result) => result.totalCount, // Optional, total number of items
    totalPages: (result) => result.totalPages, // Optional, total number of pages
}); // or new InfiniteObservablePromise(fetchData, resolver)

// Execute the promise to fetch the first page
fetchCall.execute(1);

// Execute the promise to fetch the next page
fetchCall.executeNext();

```

Or with Api service

```typescript jsx
import MOP from "mobx-observable-promise";

// Define an API service with a method that returns paginated data
const apiService = {
    fetchPageData: async (page: number) => {
        const response = await fetch(`https://api.example.com/data?page=${page}`);
        return response.json();
    },
};

// Create an InfiniteCallPromise instance
const infiniteCallPromise = MOP.infinite(apiService, "fetchPageData", {
    resolve: (result) => result.items, // Resolves the items from the API response
    nextArgs: (result, previousArgs, next) => {
        const nextPage = previousArgs[0] + 1;
        next(nextPage); // Passes the next page number to fetch
    },
    hasMore: (result) => result.hasMore, // Checks if more data is available
    totalCount: (result) => result.totalCount, // Total number of items
    totalPages: (result) => result.totalPages, // Total number of pages
}, {
    name: "Fetch Paginated Data", // Optional name for the observable promise
}); // or new InfiniteCallPromise(apiService, "fetchPageData", resolver, options)

```

`InfiniteObservablePromise` has all of the properties and methods of `ObservablePromise` plus following:

#### Observable Fields

| Property    | Type    | Description                                                                                                 |
|-------------|---------|-------------------------------------------------------------------------------------------------------------|
| resultArray | any[]   | An array containing the paginated results. Initially empty, it will be populated once the promise resolves. |
| hasMore     | boolean | A boolean indicating whether there are more pages to fetch.                                                 |
| totalItems  | number  | The total number of items across all pages.                                                                 |
| totalPages  | number  | The total number of pages in the paginated response. check `error` field for the resulted error object      |

#### Computed Fields

| Property | Type    | Description                                                                                                     |
|----------|---------|-----------------------------------------------------------------------------------------------------------------|
| isEmpty  | boolean | Returns true when the promise resolves and result array is empty, can be used to display no content placeholder |

#### Methods

#### `executeNext()`

Executes the promise with the next args.

#### `wasExecutedFirstWith(...callArgs)`

Checks if the first page was executed with given args.

#### `getList(defaultOrFactory)`

Safely gets the `resultArray` after the promise is resolved, returns default value or empty array otherwise.

### Example

Example standalone page resolver function in Typescript:

```typescript jsx
import {PageResolver} from 'mobx-observable-promise';

type PagedResponse<TItem> = {items: TItem[]};
type ResolverPromise<TItem> = (page: number) => Promise<PagedResponse<TItem>>

function getResolver<TItem>(): PageResolver<ResolverPromise<TItem>, TItem> {
    return {
        resolve: (res, args) => res.items,
        nextArgs: (res, args, next) => next(...args)
    }
}
```

### Fetch Promise

`FetchPromise` simplifies the process of sending HTTP requests using the fetch API while providing additional capabilities such as caching, parsing
responses, and managing the request state.

```typescript jsx
import MOP from "mobx-observable-promise";

// Create an instance of FetchPromise
const fetchPromise = MOP.fetch({
    url: "https://api.example.com/data",
    options: {
        method: "GET",
        headers: {
            "Content-Type": "application/json"
        }
    }
}); // or new FetchPromise(...)

// Execute the request
fetchPromise.execute().then(() => {
    console.log(fetchPromise.bodyParsed); // Parsed JSON response body
    console.log(fetchPromise.status); // HTTP status code
}).catch((error) => {
    console.error("Request failed:", error);
});

```

#### Custom Request Encoding

You can also send `form-encoded` or `json` data by setting the `form` or `json` option to true. This will convert the body property to a URL-encoded
or JSON string.

```typescript jsx
const fetchPromise = MOP.fetch({
    url: "https://api.example.com/submit",
    options: {
        method: "POST",
        form: true,
        // or json: true
        body: {key: "value"} // The body will be encoded
    }
});

```

### LoggerOptions

`MOP` supports logging with optional data, formatting options, and data truncation for large arrays or strings.

```typescript jsx
import MOP from "mobx-observable-promise";

// sets logger option for all future Observable Promises
MOP.configure({
    logger: {
        level: "info",   // Set logging level
        withData: true,  // Include data in logs
    },
});

// sets logger option for a promise, overrides default logger options
const fetchCall = MOP(fetchData, {
    logger: {
        level: "verbose",
        withData: true,
    }
});
```

| Property     | Type                                     | Description                                                                       |
|--------------|------------------------------------------|-----------------------------------------------------------------------------------|
| level        | "none" \| "error" \| "info" \| "verbose" | The minimum level of logs to show.                                                |
| withData     | boolean                                  | Whether to include additional data in the logs.                                   |
| provider     | object                                   | The logging provider, such as console. Should have log, debug, and error methods. |
| limitArrays  | number                                   | The maximum number of items to show for arrays.                                   |
| limitStrings | number                                   | The maximum length of strings to show.                                            |
| format       | boolean                                  | Whether to format the log output for better readability. Default is true          |

level (LoggingLevel): The minimum level of logs to show. Can be none, error, info, or verbose.
withData (boolean): Whether to include additional data in the logs.
provider (object): The logging provider, such as console. Should have log, debug, and error methods.
limitArrays (number): The maximum number of items to show for arrays. If set to 0, no limitation is applied.
limitStrings (number): The maximum length of strings to show. If set to 0, no limitation is applied.
format (boolean): Whether to format the log output for better readability

## Persistence

First, you need to create a persistent object on the store, after hydration simply call:

```typescript jsx
MOP.hydrate(store.persistedObject, store.todoCall);
```

## Global hook

Global hooks are called after every execution of every created promise, can be useful for logging:

```typescript jsx
MOP.registerHook(promise => {
    // do something 
});
```

## Test

```sh
npm run test
```
