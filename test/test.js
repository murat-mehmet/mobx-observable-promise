const expect = require('chai').expect;
const {ObservablePromise, CachedObservablePromise, InfiniteObservablePromise} = require('../dist/index.js');

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
        const testPromise = new ObservablePromise((waitMilliseconds) => new Promise(resolve => setTimeout(() => {
            callCount++;
            resolve(true)
        }, waitMilliseconds)));
        await testPromise.queued().execute(1000).execute(100).then(result => {
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

describe('InfiniteObservablePromise test', () => {
    it('should return true', async () => {
        const testPromise = new InfiniteObservablePromise(async (offset, count) => {
            const items = [1, 2, 3, 4, 5, 6, 7, 8, 9];
            return {
                offset,
                count,
                items: items.slice(offset, offset + count)
            }
        }, {
            nextArgs: (result, [offset, count]) => [offset + count, count],
            resolve: result => result.items
        });

        await testPromise.execute(0, 3).promise;
        expect(testPromise.resultArray).to.deep.equal([1, 2, 3]);

        await testPromise.executeNext().promise;
        expect(testPromise.resultArray).to.deep.equal([1, 2, 3, 4, 5, 6]);
    });
});