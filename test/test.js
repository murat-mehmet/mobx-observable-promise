const expect = require('chai').expect;
const {ObservablePromise} = require('../dist/index.js');

describe('ObservablePromise test', () => {
    it('should return true', async () => {
        const testPromise = new ObservablePromise((waitMilliseconds) => new Promise(resolve => setTimeout(() => resolve(true), waitMilliseconds)));
        await testPromise.execute(500).then(result => {
            expect(result).to.equal(true);
        });
    });
});