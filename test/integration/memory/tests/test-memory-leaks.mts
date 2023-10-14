import { JSHandle, Page } from 'puppeteer';
import { describe, it, expect, } from 'vitest';
import Upscaler from 'upscaler';
import * as tf from '@tensorflow/tfjs';
import { ClientsideTestRunner } from '@internals/test-runner/clientside';
import { getAllObjects, getMemory, } from '../../../setup/matchers/toHaveLeakedMemory/index.js';

const EXPECTED_LAYER_MODELS = 2; // I don't know why, but we start with layer model references in memory.
const EXPECTED_UPSCALERS = 0;

const ESBUILD_DIST_FOLDER = process.env.ESBUILD_DIST_FOLDER;
if (typeof ESBUILD_DIST_FOLDER !== 'string') {
  throw new Error('ESBUILD_DIST_FOLDER not defined in env');
}

// https://puppeteer.github.io/puppeteer/docs/10.0.0/puppeteer.page.queryobjects/#example
const countObjects = async (page: Page, prototype: JSHandle): Promise<number> => {
  const instances = await page.queryObjects(prototype);
  const numberOfObjects = await page.evaluate((i) => i.length, instances);

  await prototype.dispose();
  await instances.dispose();

  return numberOfObjects;
};

// This is the number of times to run every chunk of code to check for memory leaks.
// 7 is a nice awkward number that should be a red flag if we see it in the memory reports.
const TIMES_TO_CHECK = 7;

interface PrototypeDefinition {
  name: 'LayersModel' | 'Upscaler';
  prototype: (page: Page) => Promise<JSHandle>
}
interface TFJSMemory {
  unreliable: boolean;
  numBytesInGPU?: number;
  numBytesInGPUAllocated?: number;
  numBytesInGPUFree?: number;

  numBytes: number;
  numTensors: number;
  numDataBuffers: number;
  reasons?: string[];
}
interface MemoryRecord {
  LayersModel: number;
  Upscaler: number;
  memory: TFJSMemory;
}

const getMemory = async (page: Page): Promise<MemoryRecord> => {
  const allObjects = await Promise.all(prototypes.map(async ({ prototype }) => {
    return countObjects(page, await prototype(page));
  }));

  const names = prototypes.map(p => p.name);

  // TODO: Type mismatch between TFJS exported types
  const tfMemory: TFJSMemory = await page.evaluate(() => window['tf'].memory() as TFJSMemory);

  return allObjects.reduce((obj, objects, i) => ({
    ...obj,
    [names[i]]: objects,
  }), {
    memory: tfMemory,
    LayersModel: 0,
    Upscaler: 0,
  });
};

const prototypes: Array<PrototypeDefinition> = [
  {
    prototype: page => page.evaluateHandle(() => window['tf'].LayersModel.prototype),
    name: 'LayersModel',
  },
  {
    prototype: page => page.evaluateHandle(() => window['Upscaler'].prototype),
    name: 'Upscaler',
  },
];

const getStartingMemory = async (page: Page) => {
  const memory = await getMemory(page);
  expect(memory.LayersModel).toEqual(EXPECTED_LAYER_MODELS);
  expect(memory.Upscaler).toEqual(EXPECTED_UPSCALERS);
  return memory;
};

describe('Memory Leaks', () => {
  const testRunner = new ClientsideTestRunner({
    name: 'memory-leaks',
    mock: true,
    dist: ESBUILD_DIST_FOLDER,
    useTunnel: true,
  });

  beforeAll(async function beforeAll() {
    await testRunner.beforeAll();
  }, 120000);

  afterAll(async function modelAfterAll() {
    await testRunner.afterAll();
  }, 10000);

  beforeEach(async function beforeEach() {
    await testRunner.beforeEach('| Loaded');
  });

  afterEach(async function afterEach() {
    await testRunner.afterEach();
  });

  const tick = async (page: Page, tickTime = 10) => {
    await page.evaluate(async (duration) => {
      await new Promise(resolve => setTimeout(resolve, duration));
    }, tickTime);
  }

  const checkMemory = async (fn: () => Promise<void>, times = TIMES_TO_CHECK) => {
    const starting = await getMemory(testRunner.page);
    expect(starting.LayersModel).toEqual(EXPECTED_LAYER_MODELS);
    expect(starting.Upscaler).toEqual(EXPECTED_UPSCALERS);
    for (let i = 0; i < times; i++) {
      await fn();
      // trigger a gc
      await getAllObjects(testRunner.page);
      // wait for things to flush
      await tick(testRunner.page);
      const memory = await getMemory(testRunner.page);
      expect(starting).not.toHaveLeakedMemory(memory, i);

    }
  }

  // describe('examples of tests that explicitly throw memory leaks', () => {
  // //   // it('should throw because of maps', async () => {
  // //   //   let prototypeToCheck = await page.evaluateHandle(() => Map.prototype);
  // //   //   const startingNumberOfObjects = await countObjects(page, prototypeToCheck);

  // //   //   await page.evaluate(() => {
  // //   //     const maps = [];
  // //   //     for (let i = 0; i < 5; i++) {
  // //   //       const m = new Map();
  // //   //       maps.push(m);
  // //   //     }
  // //   //     setInterval(() => {
  // //   //       console.log(maps);
  // //   //     }, 1000);
  // //   //   });
  // //   //   prototypeToCheck = await page.evaluateHandle(() => Map.prototype);

  // //   //   const endingNumberOfObjects = await countObjects(page, prototypeToCheck);

  // //   //   expect(endingNumberOfObjects).toEqual(startingNumberOfObjects);
  // //   // });

  // //   // it('should throw because of upscalers', async () => {
  // //   //   const startingMemory = await getStartingMemory(page);

  // //   //   await page.evaluate(async (times) => {
  // //   //     const foo = [];
  // //   //     for (let i = 0; i < times; i++) {
  // //   //       const upscaler = new window['Upscaler']();
  // //   //       foo.push(upscaler)
  // //   //     }
  // //   //     setInterval(() => {
  // //   //       console.log(foo);
  // //   //     }, 1000)
  // //   //   }, TIMES_TO_CHECK);
  // //   //   const endingMemory = await getMemory(page);
  // //   //   const names = prototypes.map(p => p.name);
  // //   //   checkMemory(names, startingMemory, endingMemory);
  // //   // });

  // //   // it('should throw because of layer models', async () => {
  // //   //   const startingMemory = await getStartingMemory(page);

  // //   //   await page.evaluate(async (times) => {
  // //   //     const foo = [];
  // //   //     for (let i = 0; i < times; i++) {
  // //   //       const t = await window['tf'].loadLayersModel('/models/pixel-upsampler/models/x4/x4.json');
  // //   //       foo.push(t)
  // //   //     }
  // //   //     setInterval(() => {
  // //   //       console.log(foo);
  // //   //     }, 1000)
  // //   //   }, TIMES_TO_CHECK);
  // //   //   const endingMemory = await getMemory(page);
  // //   //   const names = prototypes.map(p => p.name);
  // //   //   checkMemory(names, startingMemory, endingMemory);
  // //   // });

  //   // it('should throw because of tensors', async () => {
  //   //   const startingMemory = await getStartingMemory(page);

  //   //   await page.evaluate(async (times) => {
  //   //     for (let i = 0; i < times; i++) {
  //   //       const t = window['tf'].tensor([[1, 2]]);
  //   //       t.dispose();
  //   //     }
  //   //   }, TIMES_TO_CHECK);
  //   //   const endingMemory = await getMemory(page);
  //   //   const names = prototypes.map(p => p.name);
  //   //   checkMemory(names, startingMemory, endingMemory);
  //   // });
  // })

  it('should create upscalers', async () => {
    await checkMemory(() => testRunner.page.evaluate(async () => {
      const upscaler = new window['Upscaler']();
      await upscaler.dispose();
    }));
  });

  it('should create an Upscaler instance and warm up', async () => {
    await checkMemory(() => testRunner.page.evaluate(async () => {
      const upscaler = new window['Upscaler']({
        warmupSizes: [10],
        model: window['@upscalerjs/pixel-upsampler/4x']
      });
      await upscaler.dispose();
    }));
  });

  it('should create an Upscaler instance with a custom model', async () => {
    await checkMemory(() => testRunner.page.evaluate(async () => {
      const upscaler = new window['Upscaler']({
        model: window['@upscalerjs/pixel-upsampler/4x']
      });
      await upscaler.dispose();
    }));
  });

  describe('Upscale with base64 output', async () => {
    let fixtureServerURL: string = '';
    let fixturePath: string = '';

    beforeAll(async () => {
      fixtureServerURL = await testRunner.getFixturesServerURL();
      fixturePath = `${fixtureServerURL}/pixel-upsampler/test/__fixtures__/fixture.png`;
    });

    it('should upscale with no pre / post processing functions', async () => {
      await checkMemory(() => testRunner.page.evaluate(async (fixturePath) => {
        const upscaler = new window['Upscaler']({
          model: window['@upscalerjs/pixel-upsampler/4x']
        });
        const image = await upscaler.execute(fixturePath);
        if (image!.substring(0, 22) !== 'data:image/png;base64,') {
          throw new Error('Bad image produced');
        }

        await upscaler.dispose();
        return image;
      }, fixturePath));
    });

    it('should upscale with a pre and no post processing functions', async () => {
      await checkMemory(() => testRunner.page.evaluate(async (fixturePath) => {
        const tf = window['tf'];
        const upscaler = new window['Upscaler']({
          model: {
            ...window['@upscalerjs/pixel-upsampler/4x'],
            preprocess: (image) => tf.mul(image, 1),
          }
        });
        const image = await upscaler.execute(fixturePath);
        if (image!.substring(0, 22) !== 'data:image/png;base64,') {
          throw new Error('Bad image produced');
        }

        await upscaler.dispose();
        return image;
      }, fixturePath));
    });

    it('should upscale with no pre and a post processing functions', async () => {
      await checkMemory(() => testRunner.page.evaluate(async (fixturePath) => {
        const tf = window['tf'];
        const upscaler = new window['Upscaler']({
          model: {
            ...window['@upscalerjs/pixel-upsampler/4x'],
            postprocess: (image) => tf.mul(image, 1),
          }
        });
        const image = await upscaler.execute(fixturePath);
        if (image!.substring(0, 22) !== 'data:image/png;base64,') {
          throw new Error('Bad image produced');
        }

        await upscaler.dispose();
      }, fixturePath));
    });

    it('should upscale with a pre and a post processing functions', async () => {
      await checkMemory(() => testRunner.page.evaluate(async (fixturePath) => {
        const tf = window['tf'];
        const upscaler = new window['Upscaler']({
          model: {
            ...window['@upscalerjs/pixel-upsampler/4x'],
            preprocess: (image) => tf.mul(image, 1),
            postprocess: (image) => tf.mul(image, 1),
          }
        });
        const image = await upscaler.execute(fixturePath);
        if (image!.substring(0, 22) !== 'data:image/png;base64,') {
          throw new Error('Bad image produced');
        }

        await upscaler.dispose();
      }, fixturePath));
    });

    it('should upscale with a pre and a post processing functions into a tensor', async () => {
      await checkMemory(() => testRunner.page.evaluate(async (fixturePath) => {
        const tf = window['tf'];
        const upscaler = new window['Upscaler']({
          model: {
            ...window['@upscalerjs/pixel-upsampler/4x'],
            preprocess: (image) => tf.mul(image, 1),
            postprocess: (image) => tf.mul(image, 1),
          }
        });
        const tensor = await upscaler.execute(fixturePath, {
          output: 'tensor',
        });

        tensor.dispose();

        await upscaler.dispose();
      }, fixturePath));
    });

    it('should upscale with a pre and a post processing functions from a tensor', async () => {
      await testRunner.page.evaluate(async (fixturePath) => {
        const getImage = () => new Promise<HTMLImageElement>(resolve => {
          const img = new Image();
          img.src = fixturePath;
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
        })
        const img = await getImage();
        window['src'] = await window['tf'].browser.fromPixels(img);
      }, fixturePath);

      await checkMemory(() => testRunner.page.evaluate(async () => {
        const tf = window['tf'];
        const upscaler = new window['Upscaler']({
          model: {
            ...window['@upscalerjs/pixel-upsampler/4x'],
            preprocess: (image) => tf.mul(image, 1),
            postprocess: (image) => tf.mul(image, 1),
          }
        });
        const image = await upscaler.execute(window['src']!);
        if (image!.substring(0, 22) !== 'data:image/png;base64,') {
          throw new Error('Bad image produced');
        }

        await upscaler.dispose();
      }));

      const isDisposed = await testRunner.page.evaluate(async () => window['src']!.isDisposed);
      expect(isDisposed).toEqual(false);
    });

    it('should upscale with a pre and a post processing functions with patch sizes', async () => {
      await checkMemory(() => testRunner.page.evaluate(async (fixturePath) => {
        const tf = window['tf'];
        const upscaler = new window['Upscaler']({
          model: {
            ...window['@upscalerjs/pixel-upsampler/4x'],
            preprocess: (image) => tf.mul(image, 1),
            postprocess: (image) => tf.mul(image, 1),
          }
        });
        const image = await upscaler.execute(fixturePath, {
          patchSize: 5,
          padding: 0,
        });
        if (image!.substring(0, 22) !== 'data:image/png;base64,') {
          throw new Error('Bad image produced');
        }

        await upscaler.dispose();
      }, fixturePath));
    });

    // it('should upscale with an ESRGAN-thick model', async () => {
    //   await checkMemory(() => testRunner.page.evaluate(async (fixturePath) => {
    //     const Upscaler = window['Upscaler'];
    //     const ESRGANThick = window['@upscalerjs/esrgan-thick/4x'];
    //     const upscaler = new window['Upscaler']({
    //       model: ESRGANThick,
    //     });
    //     const image = await upscaler.execute(fixturePath);
    //     if (image!.substring(0, 22) !== 'data:image/png;base64,') {
    //       throw new Error('Bad image produced');
    //     }

    //     await upscaler.dispose();
    //   }, `${fixtureServerURL}/esrgan-thick/assets/fixture.png`));
    // });

    it('should callback to progress with a src', async () => {
      await checkMemory(() => testRunner.page.evaluate(async (fixturePath) => {
        const upscaler = new window['Upscaler']({
          model: {
            ...window['@upscalerjs/pixel-upsampler/4x'],
          },
        });
        let output;
        await upscaler.execute(fixturePath, {
          output: 'base64',
          patchSize: 14,
          padding: 2,
          progress: (_, slice) => {
            output = slice;
          }
        });
        if (output!.substring(0, 22) !== 'data:image/png;base64,') {
          throw new Error('Bad image produced');
        }

        await upscaler.dispose();
      }, fixturePath));
    });

    it('should callback to progress with a tensor', async () => {
      await checkMemory(() => testRunner.page.evaluate(async (fixturePath) => {
        let output: tf.Tensor3D = undefined;
        const upscaler = new window['Upscaler']({
          model: {
            ...window['@upscalerjs/pixel-upsampler/4x'],
          },
        });
        await upscaler.execute(fixturePath, {
          output: 'base64',
          progressOutput: 'tensor',
          patchSize: 14,
          padding: 2,
          progress: (_rate, slice) => {
            if (output && 'shape' in output) {
              output.dispose();
            }
            output = slice;
          }
        });

        await upscaler.dispose();
        if (!output || !('shape' in output)) {
          throw new Error('Output was never set to a valid tensor');
        }
        const { shape } = output;
        if (shape.length !== 3 || shape[0] !== 16 || shape[1] !== 16 || shape[2] !== 3) {
          throw new Error(`Bad output shape produced: ${shape}`);
        }
        output.dispose();
      }, fixturePath));
    });

    it('should cancel without leaking memory', async () => {
      await checkMemory(() => testRunner.page.evaluate((fixturePath) => new Promise<void>((resolve) => {
        const abortController = new AbortController();
        const upscaler = new window['Upscaler']({
          model: {
            ...window['@upscalerjs/pixel-upsampler/4x'],
          },
        });
        upscaler.execute(fixturePath, {
          output: 'base64',
          signal: abortController.signal,
        }).catch(() => {
          upscaler.dispose().then(resolve);
        });
        abortController.abort();
      }), fixturePath));
    });

    it('should cancel without leaking memory with patch sizes', async () => {
      await checkMemory(() => testRunner.page.evaluate(async (fixturePath) => {
        const Upscaler = window['Upscaler'];
        const abortController = new AbortController();
        const upscaler = new Upscaler({
          model: window['@upscalerjs/pixel-upsampler/4x'],
        });
        try {
          await upscaler.execute(fixturePath, {
            output: 'base64',
            signal: abortController.signal,
            patchSize: 14,
            padding: 2,
            progress: (rate: number) => {
              if (rate >= .5) {
                abortController.abort();
              }
            }
          });
        } catch (err) { }

        await upscaler.dispose();
      }, fixturePath), 3);
    });

    it('should cancel without leaking memory with patch sizes and a tensor response', async () => {
      await checkMemory(() => testRunner.page.evaluate(async (fixturePath) => {
        const Upscaler = window['Upscaler'];
        const abortController = new AbortController();
        const upscaler = new Upscaler({
          model: window['@upscalerjs/pixel-upsampler/4x'],
        });
        try {
          await upscaler.execute(fixturePath, {
            output: 'tensor',
            signal: abortController.signal,
            patchSize: 14,
            padding: 2,
            progress: (rate, slice) => {
              slice.dispose();
              if (rate >= .5) {
                abortController.abort();
              }
            }
          });
        } catch (err) { }

        await upscaler.dispose();
      }, fixturePath));
    });
  });
});

declare global {
  interface Window {
    Upscaler: typeof Upscaler;
    tf: typeof tf;
    src?: tf.Tensor4D | tf.Tensor3D;
    output?: tf.Tensor;
  }
}
