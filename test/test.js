const {reaction} = require("mobx");
const expect = require('chai').expect;
const {ObservablePromise, CachedObservablePromise, InfiniteObservablePromise} = require('../dist/index.js');
ObservablePromise.configure({
    logger: {
        level: "verbose",
        limitArrays: 2,
        limitStrings: 3,
        withData: true
    },
})

describe('ObservablePromise test', () => {
    it('should return true', async () => {
        const testPromise = new ObservablePromise((waitMilliseconds) => new Promise(resolve => setTimeout(() => resolve(true), waitMilliseconds)));
        testPromise.getResultOrDefault()
        await testPromise.execute(500).then(result => {
            expect(result).to.equal(true);
        });
    });
});
describe('ObservablePromise limitStrings test', () => {
    it('should return true', async () => {
        const testPromise = new ObservablePromise((waitMilliseconds) => new Promise(resolve => setTimeout(() => resolve({
            test: {
                test2: '123456'
            }
        }), waitMilliseconds)), {
            logger: {
                limitArrays: 2
            }
        });
        testPromise.getResultOrDefault()
        await testPromise.execute(500).then(result => {
            expect(result.test).to.equal('123456');
        });
    });
});

describe('ObservablePromise with delay', () => {
    it('should return true', async () => {
        const start = new Date();
        const testPromise = new ObservablePromise((waitMilliseconds) => new Promise(resolve => setTimeout(() => resolve(true), waitMilliseconds)), {
            delay: 500
        });

        await testPromise.execute(500).then(result => {
            console.log('result', result)
            expect(Date.now() - start.valueOf()).to.be.greaterThan(1000);
            expect(result).to.equal(true);
        });
    });
});

describe('ObservablePromise with fill', () => {
    it('should return true', async () => {
        const start = new Date();
        const testPromise = new ObservablePromise((waitMilliseconds) => new Promise(resolve => setTimeout(() => resolve(true), waitMilliseconds)), {
            fill: 1000
        });

        await testPromise.execute(500).then(result => {
            console.log('result', result)
            expect(Date.now() - start.valueOf()).to.be.greaterThan(1000);
            expect(result).to.equal(true);
        });
    });
});

describe('ObservablePromise with timeout', () => {
    it('should return true', async () => {
        const start = new Date();
        const testPromise = new ObservablePromise((waitMilliseconds) => new Promise(resolve => setTimeout(() => resolve(true), waitMilliseconds)), {
            timeout: 800
        });

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
describe('ObservablePromise registerHookOnce test', () => {
    it('should return true', async () => {
        let runCount = 0;
        const testPromise = new ObservablePromise((waitMilliseconds) => new Promise(resolve => setTimeout(() => resolve(true), waitMilliseconds)));
        testPromise.registerHookOnce(() => runCount++);
        await testPromise.queued().execute(500).execute(500).then(result => {
            expect(runCount).to.equal(1);
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

describe('InfiniteObservablePromise resultArray reaction test', () => {
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

        let reacted = 0;
        reaction(() => testPromise.resultArray, () => {
            console.log('reacted', testPromise.resultArray && testPromise.resultArray.length);
            reacted++;
        });

        await testPromise.execute(0, 3).promise;
        expect(testPromise.resultArray).to.deep.equal([1, 2, 3]);

        await testPromise.executeNext().promise;
        expect(testPromise.resultArray).to.deep.equal([1, 2, 3, 4, 5, 6]);


        await testPromise.execute(0, 3).promise;
        expect(testPromise.resultArray).to.deep.equal([1, 2, 3]);


        expect(reacted).to.equal(2);
    });
});

describe('ObservablePromise InfiniteObservablePromise resolve test', () => {
    it('should return true', async () => {
        const testObsPromise = new ObservablePromise(async (offset, count) => {
            const items = [1, 2, 3, 4, 5, 6, 7, 8, 9];
            return {
                offset,
                count,
                items: items.slice(offset, offset + count)
            }
        });
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
        //execute obs
        await testObsPromise.execute(0, 3).promise;
        testPromise.resolve(testObsPromise.result);
        expect(testPromise.resultArray).to.deep.equal([1, 2, 3]);
    });
});

describe('ObservablePromise persist test', () => {
    it('should return true', async () => {
        const persistStore = {};
        let testPromise = new ObservablePromise((waitMilliseconds) => new Promise(resolve => setTimeout(() => resolve(true), waitMilliseconds)), {name: 'testPromise', expiresIn: 1000});
        ObservablePromise.hydrate(persistStore, testPromise);
        await testPromise.execute(100).then(async result => {

            await new Promise(resolve => setTimeout(() => resolve(true), 100))
            testPromise = new ObservablePromise((waitMilliseconds) => new Promise(resolve => setTimeout(() => resolve(true), waitMilliseconds)), {name: 'testPromise', expiresIn: 1000});
            ObservablePromise.hydrate(persistStore, testPromise);
            expect(testPromise.result).to.equal(true);
        });

    });
});

describe('CachedObservablePromise persist test', () => {
    it('should return true', async () => {
        let runCount = 0;
        const persistStore = {};
        let testPromise = new CachedObservablePromise((waitMilliseconds) => new Promise(resolve => {
            runCount++;
            setTimeout(() => resolve(true), waitMilliseconds);
        }), {name: 'testPromise', expiresIn: 500});
        ObservablePromise.hydrate(persistStore, testPromise);
        await testPromise.execute(50).then(result => {
            expect(result).to.equal(true);
            expect(runCount).to.equal(1);
        });
        await new Promise(resolve => setTimeout(() => resolve(true), 200))
        await testPromise.execute(100).then(async result => {
            expect(result).to.equal(true);
            expect(runCount).to.equal(2);


            await new Promise(resolve => setTimeout(() => resolve(true), 300))
            testPromise = new CachedObservablePromise((waitMilliseconds) => new Promise(resolve => {
                runCount++;
                setTimeout(() => resolve(true), waitMilliseconds);
            }), {name: 'testPromise', expiresIn: 500});
            ObservablePromise.hydrate(persistStore, testPromise);
            expect(testPromise.result).to.equal(true);
            await testPromise.execute(100).then(result => {
                expect(result).to.equal(true);
                expect(runCount).to.equal(2);
            });
        });
    });
});
