const {reaction, toJS} = require("mobx");
const expect = require('chai').expect;
const {ObservablePromise, CachedObservablePromise, InfiniteObservablePromise} = require('../dist/index.js');
ObservablePromise.configure({
  logger: {
    level: "verbose",
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
        limitStrings: 2
      }
    });
    testPromise.getResultOrDefault()
    await testPromise.execute(500).then(result => {
      expect(result.test).to.deep.equal({
          test2: '123456'
        }
      );
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
    testPromise.registerHookOnce(() => runCount++, 'runCountHook');
    await testPromise.queued().execute(500).execute(500).then(result => {
      expect(runCount).to.equal(1);
    });
  });
});
describe('ObservablePromise hook must be completed before then()', () => {
  it('should return true', async () => {
    let runCount = 0;
    const testPromise = new ObservablePromise((waitMilliseconds) => new Promise(resolve => setTimeout(() => resolve(true), waitMilliseconds)));
    testPromise.registerHook(() => runCount++, 'runCountHook');
    testPromise.registerHook(() => runCount = 5, 'runCountHook2');
    await testPromise.execute(500).then(result => {
      expect(runCount).to.equal(5);
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

describe('InfiniteObservablePromise cache test', () => {
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
    let testPromise = new ObservablePromise((waitMilliseconds) => new Promise(resolve => setTimeout(() => resolve(true), waitMilliseconds)), {
      name: 'testPromise',
      expiresIn: 1000
    });
    ObservablePromise.hydrate(persistStore, testPromise);
    await testPromise.execute(100).then(async result => {

      await new Promise(resolve => setTimeout(() => resolve(true), 100))
      testPromise = new ObservablePromise((waitMilliseconds) => new Promise(resolve => setTimeout(() => resolve(true), waitMilliseconds)), {
        name: 'testPromise',
        expiresIn: 1000
      });
      console.log('persistStore',persistStore)
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


describe('ObservablePromise concurrent test', () => {
  it('with queued should return correct result', async () => {
    const testPromise = new ObservablePromise((waitMilliseconds, arg) => new Promise(resolve => setTimeout(() => resolve(arg), waitMilliseconds)), {queued: true});
    const testFn = (i) => {
      let arg = Math.random().toString();
      return testPromise.execute(randomIntFromInterval(1, 100), arg).then(result => {
        expect(result).to.equal(arg);
      });
    }
    let promises = []
    for (let i = 0; i < 10; i++) {
      promises.push(testFn(i));
    }
    await Promise.all(promises);
  }, 30000);

  it('without queued should return correct result', async () => {
    const testPromise = new ObservablePromise((waitMilliseconds, arg) => new Promise(resolve => setTimeout(() => resolve(arg), waitMilliseconds)));
    let firstArg;
    const testFn = (i) => {
      let arg = Math.random().toString();
      if (i === 0)
        firstArg = arg;
      return testPromise.execute(randomIntFromInterval(1, 100), arg).then(result => {
        expect(result).to.equal(firstArg);
      });
    }
    let promises = []
    for (let i = 0; i < 10; i++) {
      promises.push(testFn(i));
    }
    await Promise.all(promises);
  }, 30000);

  it('cached with queued should return correct result', async () => {
    let runCounts = {};
    const testPromise = new CachedObservablePromise((waitMilliseconds, arg) => new Promise(resolve => {
      runCounts['_' + arg] = (runCounts['_' + arg] || 0) + 1;
      setTimeout(() => resolve(arg), waitMilliseconds);
    }), {queued: true});
    const testFn = async (i) => {
      let arg = Math.random().toString();
      const interval = randomIntFromInterval(1, 100)
      await testPromise.execute(interval, arg).then(result => {
        expect(result).to.equal(arg);
        expect(runCounts['_' + arg]).to.equal(1);
      });
      await testPromise.execute(interval, arg).then(result => {
        expect(result).to.equal(arg);
        expect(runCounts['_' + arg]).to.equal(1);
      });
    }
    let promises = []
    for (let i = 0; i < 10; i++) {
      promises.push(testFn(i));
    }
    await Promise.all(promises);
  }, 30000);

  it('cached with expiresIn with queued should return correct result', async () => {
    let runCount = 0;
    const testPromise = new CachedObservablePromise((waitMilliseconds, arg) => new Promise(resolve => {
      runCount++;
      setTimeout(() => resolve(arg), waitMilliseconds);
    }), {queued: true, expiresIn: 500});
    let expected = 1;
    setTimeout(() => {
      expected = 2;
    }, 500);
    let arg = Math.random().toString();
    const testFn = async (i) => {
      const interval = 250;
      await testPromise.execute(interval, arg).then(result => {
        expect(result).to.equal(arg);
        expect(runCount).to.equal(expected);
      });
      await testPromise.execute(interval, arg).then(result => {
        expect(result).to.equal(arg);
        expect(runCount).to.equal(expected);
      });
    }
    let promises = []
    for (let i = 0; i < 4; i++) {
      promises.push(testFn(i));
    }
    await Promise.all(promises);
  }, 30000);

  it('cached without queued should return correct result', async () => {
    let runCounts = {};
    const testPromise = new CachedObservablePromise((waitMilliseconds, arg) => new Promise(resolve => {
      runCounts['_' + arg] = (runCounts['_' + arg] || 0) + 1;
      setTimeout(() => resolve(arg), waitMilliseconds);
    }));
    let firstArg;
    const testFn = async (i) => {
      let arg = Math.random().toString();
      if (i === 0)
        firstArg = arg;
      const interval = randomIntFromInterval(1, 100)
      await testPromise.execute(interval, arg).then(result => {
        expect(result).to.equal(firstArg);
        expect(runCounts['_' + firstArg]).to.equal(1);
      });
      await testPromise.execute(interval, arg).then(result => {
        expect(result).to.equal(firstArg);
        expect(runCounts['_' + firstArg]).to.equal(1);
      });
    }
    let promises = []
    for (let i = 0; i < 10; i++) {
      promises.push(testFn(i));
    }
    await Promise.all(promises);
  }, 30000);

  it('infinite with queued should return correct result', async () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const testPromise = new InfiniteObservablePromise((waitMilliseconds, arg, offset, count) =>
      new Promise(resolve => setTimeout(() => {
        {
          resolve({
            offset,
            count,
            arg,
            items: items.slice(offset, offset + count)
          })
        }
        resolve(arg);
      }, waitMilliseconds)), {
      nextArgs: (result, [interval, arg, offset, count]) => [interval, arg, offset + count, count],
      resolve: result => result.items
    }, {queued: true});


    let testFn = async (i) => {
      let arg = Math.random().toString();
      const interval = randomIntFromInterval(1, 100);
      await testPromise.execute(interval, arg, 0, 3).promise;
      expect(testPromise.resultArray).to.deep.equal([1, 2, 3]);
    }
    let promises = []
    for (let i = 0; i < 10; i++) {
      promises.push(testFn(i));
    }
    await Promise.all(promises);

    testFn = async (i) => {

      await testPromise.executeNext().promise;
    }
    promises = []
    for (let i = 0; i < 10; i++) {
      promises.push(testFn(i));
    }
    await Promise.all(promises);

    expect(testPromise.resultArray).to.deep.equal(items);
  }, 30000);

  it('infinite without queued should return correct result', async () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const testPromise = new InfiniteObservablePromise((waitMilliseconds, arg, offset, count) =>
      new Promise(resolve => setTimeout(() => {
        {
          resolve({
            offset,
            count,
            items: items.slice(offset, offset + count)
          })
        }
        resolve(arg);
      }, waitMilliseconds)), {
      nextArgs: (result, [interval, arg, offset, count]) => [interval, arg, offset + count, count],
      resolve: result => result.items
    });

    let arg = Math.random().toString();
    const interval = randomIntFromInterval(1, 100);
    await testPromise.execute(interval, arg, 0, 3).promise;
    expect(testPromise.resultArray).to.deep.equal([1, 2, 3]);

    const testFn = async (i) => {

      await testPromise.executeNext().promise;
    }
    let promises = []
    for (let i = 0; i < 10; i++) {
      promises.push(testFn(i));
    }
    await Promise.all(promises);

    expect(testPromise.resultArray).to.deep.equal([1, 2, 3, 4, 5, 6]);
  }, 30000);

  it('with queued should throw on cancel', async () => {
    const testPromise = new ObservablePromise((waitMilliseconds, arg) => new Promise(resolve => setTimeout(() => resolve(arg), waitMilliseconds)), {queued: true});
    const testFn = (i) => {
      let arg = Math.random().toString();
      return testPromise.execute(randomIntFromInterval(1, 100), arg).then(result => {
        expect(result).to.equal(arg);
      }).catch(e => {
        console.log(e.message);
        expect(e.message).to.equal('ObservablePromise was reset while executing');
      });
    }
    let promises = []
    for (let i = 0; i < 10; i++) {
      promises.push(testFn(i));
    }
    testPromise.reset().execute(1, 'test').then(result => {
      expect(result).to.equal('test');
    });
    await Promise.all(promises);
  }, 30000);

  it('without queued should throw on cancel', async () => {
    const testPromise = new ObservablePromise((waitMilliseconds, arg) => new Promise(resolve => setTimeout(() => resolve(arg), waitMilliseconds)));

    let firstArg;
    const testFn = (i) => {
      let arg = Math.random().toString();
      if (i === 0)
        firstArg = arg;
      return testPromise.execute(randomIntFromInterval(1, 100), arg).then(result => {
        expect(result).to.equal(firstArg);
      }).catch(e => {
        console.log(e.message);
        expect(e.message).to.equal('ObservablePromise was reset while executing');
      });
    }
    let promises = []
    for (let i = 0; i < 10; i++) {
      promises.push(testFn(i));
    }
    testPromise.reset().execute(1, 'test').then(result => {
      expect(result).to.equal(firstArg);
    });
    await Promise.all(promises);
  }, 30000);

  it('with args reload', async () => {
    const testPromise = new ObservablePromise((waitMilliseconds, arg) => new Promise(resolve => setTimeout(() => resolve(arg), waitMilliseconds)));

    testPromise.withArgs(500, 'test').resolve('test');
    expect(testPromise.result).to.equal('test');
    await testPromise.reload();
    expect(testPromise.result).to.equal('test');
  }, 30000);
});

function randomIntFromInterval(min, max) { // min and max included
  return Math.floor(Math.random() * (max - min + 1) + min)
}
