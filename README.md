# STILL IN DEVELOPMENT

# MobX Observable Promise
*Promise implementation for mobx stores.*

An observable promise is a simple promise with observable fields. 
## Installation 
```sh
npm install mobx-observable-promise --save
yarn add mobx-observable-promise
```
## Usage
```javascript
import {observable} from "mobx";
import {ObservablePromise} from 'mobx-observable-promise';

export class MyStore {
    @observable myApiRequest = new ObservablePromise(() => fetch(baseUri + '/endpoint'));
}
```
## Test 
```sh
npm run test
```