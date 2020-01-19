# mobx-observable-promise
Observable promise implementation for mobx stores
## Installation 
```sh
npm install mobx-observable-promise --save
yarn add mobx-observable-promise
```
## Usage
### Javascript
```javascript
var ObservablePromise = require('mobx-observable-promise').ObservablePromise;
var mission = new ObservablePromise(async () => {
    // your async code
});
```
### TypeScript
```typescript
import { ObservablePromise } from 'mobx-observable-promise';
var mission = new ObservablePromise(async () => {
    // your async code
});
```
## Test 
```sh
npm run test
```