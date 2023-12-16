# STILL IN DEVELOPMENT

# MobX Observable Promise
*Promise implementation for mobx stores.*

An observable promise is a simple promise with observable fields. You can track promise status using these fields (is executing?, completed?, error?).

Main target here is to minimize recurring code as much as possible. 
Api calls and native calls in RN cover most of the app we create, and we need to track status for each promise,
show spinners, display results, catch errors and report them, or implement analytics method for each one of them.

By using this library, this becomes much easier.    
## Installation 
```sh
npm install mobx-observable-promise --save
yarn add mobx-observable-promise
```
## Usage
```javascript
import React, {Component} from 'react';
import {observable} from "mobx";
import {ObservablePromise} from 'mobx-observable-promise';

@observer
export class App extends Component {
    @observable myApiRequest = new ObservablePromise(() => fetch(baseUri + '/endpoint'));
}
```

<details>
  <summary>So you can do things like....</summary>

```typescript jsx
@observer
export class App extends Component {
    @observable productsCall = new ObservablePromise(() => fetch(baseUri + '/products'))

    componentDidMount() {
        this.productsCall.execute().catch()
    }
    
    render() {
        return (
            <div>
                {this.productsCall.getResult([]).map(product =>
                    <p key={product.id}>
                        {product.name}
                    </p>
                )}
                <Loader shown={this.productsCall.isExecuting} />
                <ErrorHandler calls={[this.productsCall]} />
            </div>
        )
    }

}
```

</details>

<details>
  <summary>... instead of mess like ... </summary>

```typescript jsx
export class App extends Component {
    state = {
        isExecuting: false,
        isError: false,
        error: null,
        products: []
    }

    componentDidMount() {
        this.callProducts();
    }

    callProducts() {
        this.setState({isExecuting: true});
        return fetch(baseUri + '/products').then(result => {
            this.setState({
                products: result,
                isError: false,
                error: null
            })
        }).catch(e => {
            this.setState({
                isError: true,
                error: e
            })
        }).finally(() => {
            this.setState({isExecuting: false});
        })
    }

    
    render() {
        return (
            <div>
                {this.state.products.map(product =>
                    <p key={product.id}>
                        {product.name}
                    </p>
                )}
                <Loader shown={this.state.isExecuting} />
                <ErrorHandler isError={this.state.isError} 
                              error={this.state.error}
                              retry={this.callProducts}
                              name={'product-call'} />
            </div>
        )
    }

}
```

</details>

## API
### ObservablePromise
This is the base class for all promise types in this lib.
#### Constructor
```js
new ObservablePromise(action, parser?, name?);
```

| Argument     | Type            | Description
| ------------ | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- 
| action       | Async Function  | An async action which returns a promise. This action will be run when you call `execute` method  
| parser       | (result) => any | An optional selector, which will parse action result. Can be used to implement a common error handler to all promises.                                                                                                                                   
| name         | string          | An optional name parameter to define this observable promise, which may be useful in error reporting

#### Observable Fields

The following fields are marked as observable and you can use them in your observer components

| Property              | Type         | Description
| -----------------     | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- 
| result                | any          | Resolved result object of the underlying promise 
| error                 | any          | Error object, in case the promise is rejected                                                                                                                                   
| isExecuting           | boolean      | Returns true while the promise is getting executed                                                                                                                                                                                                                                                                        
| isError               | boolean      | Returns true if the last execution of promise was rejected, check `error` field for the resulted error object                                                                                            
| wasExecuted           | boolean      | Returns true if the promise is executed at least once                                                

#### Computed Fields

The following fields are computed readonly properties. You can use them in your observer components but you cannot modify them directly.

| Property              | Type         | Description
| -----------------     | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- 
| isExecutingFirstTime  | boolean      | Returns true while the promise is getting executed for the first time                                                                                                                                                                                                                                                                        
| wasSuccessful         | boolean      | Returns true if the last execution of promise was resolved successfully, check `result` field for the resulted object

#### Other Fields

The following fields are computed readonly properties. You can use them in your observer components but you cannot modify them directly.

| Property              | Type         | Description
| -----------------     | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- 
| promise               | Promise      | Returns the underlying promise which the action is executing / was executed lastly                                                                                                                                                                                                                                                                        
| args                  | any          | Returns the arguments which the `execute` was called lastly

#### Methods

#### `execute(...callArgs)`
Executes the actual promise which was given in constructor as action parameter. The arguments are passed directly to the action.
##### Example
```js
@observable myApiRequest = new ObservablePromise((keyword) => fetch(baseUri + '/search?q=' + keyword));

myApiRequest.execute('some-keyword');
```

#### `getResult(default)`
If the promise was executed successfully, returns the result field, else returns `default` parameter of this function
##### Example
```js
const list = promise.getResult([]);
// which is same as
let list;
if (promise.wasSuccessful)
    list = promise.result;
else
    list = [];
```
#### `getResult(selector, default)`
If the promise was executed successfully, returns the result field using the selector function, else returns `default` parameter of this function
##### Example
```js
const list = promise.getResult(result => result.data, []);
// which is same as
let list;
if (promise.wasSuccessful)
    list = promise.result.data;
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
myApiRequest.execute('some-keyword').then(console.log)
// which is same as
myApiRequest.execute('some-keyword');
myApiRequest.promise.then(console.log);
```
#### `catch(onRejected)`
Calls and returns the `catch` method of promise with `onRejected` parameter
##### Example
```js
myApiRequest.execute('some-keyword').catch(console.warn)
// which is same as
myApiRequest.execute('some-keyword');
myApiRequest.promise.catch(console.warn);
```
#### `resolve(result)`
This method can be used to directly set result without actually executing the promise
#### `reject(result)`
This method can be used to directly set error without actually executing the promise
#### `chain(promise)`
Chain the results with the specified promise. After executing this promise, any result will be passed to the specified promise. Note that `chain` methods use `registerHook` under the hood so you can call the returned function to unchain the promise.
```js
const unchain = promise.chain(anotherPromise);
// later if you need
unchain();
```
#### `chainResolve(promise)`
Chain the result with the specified promise. After executing this promise, only successful result will be passed to the specified promise.
#### `chainReject(promise)`
Chain the error with the specified promise. After executing this promise, only error will be passed to the specified promise.
#### `chainReload(promise)`
Chain the specified promise to reload after a successful resolve.
#### `registerHook(promise => {})`
You can register a function which will be called after every promise execution. You should check if promise was executed successfully or rejected with an error.

You can create a generic error reporter here, or chain promises after one another.
#### `registerHookOnce(promise => {})`
You can register a function which will be called once after an execution.
#### `unregisterHook(hook)`
Unregisters the hook given in `registerHook`
#### `queued()`
This can be used in an edge case where you need to call multiple executions one after another. 
The result/error will always contain the latest executed promise output. See [Limitations](#limitations) section for more detail.
##### Example
```js
//This is how you can chain executions without using 'then'
myApiRequest.queued().execute('some-keyword').execute('another-keyword');
//which is same as
myApiRequest.execute('some-keyword').then(() => myApiRequest.execute('another-keyword'));
```
## Advices and Notes
* Use `isExecuting` to 
*  

## Limitations
* **By design, an observable promise can only execute one promise at a time.** 
All executions will be discarded while a promise is already executing. 
If possible, either chain calls with `then` or create multiple observable promise objects and execute them. 
However in case you need to call a promise multiple times without possibility to chain with `then`, 
you can use `queued()` method once to enable chained execution. 
Which means all `execute` calls will be chained instead of getting discarded. 
##### Example
```js
// Anywhere before execute()
myApiRequest.queued();
// Later whenever you need to call it, just execute it
myApiRequest.execute().then(console.log)

```

## Test 
```sh
npm run test
```
