const expect = require('chai').expect;
const {ObservablePromise, CachedObservablePromise} = require('../dist/index.js');

describe('ObservablePromise test', () => {
    it('should return true', async () => {
        const testPromise = new ObservablePromise((waitMilliseconds) => new Promise(resolve => setTimeout(() => resolve(true), waitMilliseconds)));
        testPromise.getResultOrDefault()
        await testPromise.execute(500).then(result => {
            expect(result).to.equal(true);
        });
    });
});
describe('ObservablePromise queue test', () => {
    it('should return true', async () => {
        let callCount = 0;
        const testPromise = new ObservablePromise((waitMilliseconds) => new Promise(resolve => setTimeout(() => {callCount++; resolve(true)}, waitMilliseconds)));
        testPromise.execute(1000);
        await testPromise.queued().execute(100).then(result => {
            expect(callCount).to.equal(2);
        });
    });
});
describe('CachedObservablePromise test', () => {
    it('should return true', async () => {
        let runCount = 0;
        const testPromise = new CachedObservablePromise((waitMilliseconds) => new Promise(resolve => {
            runCount++;
            setTimeout(() => resolve(true), waitMilliseconds); 
        }));
        await testPromise.execute(500).then(result => {
            expect(result).to.equal(true);
            expect(runCount).to.equal(1);
        });
        await testPromise.execute(500).then(result => {
            expect(result).to.equal(true);
            expect(runCount).to.equal(1);
        });
    });
});