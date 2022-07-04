import puppeteer, { Browser, BrowserContext, Page } from 'puppeteer';
import { bundle, DIST } from '../../lib/esm-esbuild/prepare';
import { startServer } from '../../lib/shared/server';
import * as http from 'http';
import Upscaler, { ModelDefinition } from 'upscaler';
import * as tf from '@tensorflow/tfjs';

const JEST_TIMEOUT_IN_SECONDS = 30;
jest.setTimeout(JEST_TIMEOUT_IN_SECONDS * 1000);
jest.retryTimes(1);

const EXPECTED_LAYER_MODELS = 2; // I don't know why, but we start with layer model references in memory.
const EXPECTED_UPSCALERS = 0;

const stopServer = (server?: http.Server): Promise<void | undefined | Error> => new Promise((resolve) => {
  if (server) {
    server.close(resolve);
  } else {
    console.warn('No server found')
    resolve();
  }
});

// https://puppeteer.github.io/puppeteer/docs/10.0.0/puppeteer.page.queryobjects/#example
const countObjects = async (page: Page, prototype: puppeteer.JSHandle): Promise<number> => {
  const instances = await page.queryObjects(prototype);
  const numberOfObjects = await page.evaluate((i) => i.length, instances);

  await prototype.dispose();
  await instances.dispose();

  return numberOfObjects;
};

const PORT = 8099;

// This is the number of times to run every chunk of code to check for memory leaks.
// 7 is a nice awkward number that should be a red flag if we see it in the memory reports.
const TIMES_TO_CHECK = 7;

interface PrototypeDefinition {
  name: 'LayersModel' | 'Upscaler';
  prototype: (page: Page) => Promise<puppeteer.JSHandle>
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

const getStartingMemory = async (page: Page, prototypes: Array<PrototypeDefinition>) => {
  const memory = await getMemory(page);
  expect(memory.LayersModel).toEqual(EXPECTED_LAYER_MODELS);
  expect(memory.Upscaler).toEqual(EXPECTED_UPSCALERS);
  return memory;
};

describe('Memory Leaks', () => {
  let browser: Browser;
  let context: BrowserContext;
  let page: Page;
  let server: http.Server;

  beforeAll(async () => {
    const start = async () => {
      await bundle();
      server = await startServer(PORT, DIST);
    }
    const launch = async () => {
      browser = await puppeteer.launch();
    }
    await Promise.all([
      launch(),
      start(),
    ]);
  });

  beforeEach(async () => {
    context = await browser.createIncognitoBrowserContext();
    page = await context.newPage();
    // page.on('console', message => {
    //   console.log('[PAGE]', message.text());
    // });
    await page.goto(`http://localhost:${PORT}`)
  })

  afterEach(async () => {
    await context.close();
  })

  afterAll(async () => {
    await new Promise(resolve => setTimeout(resolve, 10000))
    await Promise.all([
      stopServer(server),
      browser.close(),
    ]);
  });

  const tick = async (page: puppeteer.Page, tickTime = 10) => {
    await page.evaluate(async (duration) => {
      await new Promise(resolve => setTimeout(resolve, duration));
    }, tickTime);
  }

  const checkMemory = (names: Array<'LayersModel' | 'Upscaler'>, starting: MemoryRecord, ending: MemoryRecord) => {
    expect(starting.memory.numTensors).toEqual(ending.memory.numTensors);
    expect(starting.memory.numDataBuffers).toEqual(ending.memory.numDataBuffers);
    for (let i = 0; i < names.length; i++) {
      const name = names[i];
      const startingObjects = starting[name];
      const endingObjects = ending[name];
      try {
        expect(endingObjects).toEqual(startingObjects);
      } catch(err) {
        const diff = endingObjects - startingObjects;
        expect(new Error(`Memory Leak, there are ${diff} objects of type ${name} and there should be 0. Ending objects: ${endingObjects}, starting objects: ${startingObjects}`)).toBeUndefined();
      }
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
  // //   //   const startingMemory = await getStartingMemory(page, prototypes);

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
  // //   //   const startingMemory = await getStartingMemory(page, prototypes);

  // //   //   await page.evaluate(async (times) => {
  // //   //     const foo = [];
  // //   //     for (let i = 0; i < times; i++) {
  // //   //       const t = await window['tf'].loadLayersModel('/pixelator/pixelator.json');
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
  //   //   const startingMemory = await getStartingMemory(page, prototypes);

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
    const startingMemory = await getStartingMemory(page, prototypes);

    await page.evaluate(async (times) => {
      const Upscaler = window['Upscaler'];
      for (let i = 0; i < times; i++) {
        // TODO: Revert this to use the default
        // const upscaler = new Upscaler();
        const upscaler = new Upscaler({
          model: {
            path: '/pixelator/pixelator.json',
            scale: 4,
          }
        });
        await upscaler.dispose();
      }
    }, TIMES_TO_CHECK);

    await tick(page);

    const endingMemory = await getMemory(page);
    const names = prototypes.map(p => p.name);
    checkMemory(names, startingMemory, endingMemory);
  });

  it('should create an Upscaler instance and warm up', async () => {
    const startingMemory = await getStartingMemory(page, prototypes);

    await page.evaluate(async (times) => {
      const Upscaler = window['Upscaler'];
      const ESRGANGANS = window['esrgan-legacy']['gans'];
      for (let i = 0; i < times; i++) {
        // TODO: Revert this to use the default
        // const upscaler = new Upscaler({
        //   warmupSizes: [[50, 50]],
        // });
        const upscaler = new Upscaler({
          warmupSizes: [[50, 50]],
          model: ESRGANGANS,
        });
        await upscaler.dispose();
      }
    }, TIMES_TO_CHECK);

    await tick(page);

    const endingMemory = await getMemory(page);
    const names = prototypes.map(p => p.name);
    checkMemory(names, startingMemory, endingMemory);
  });

  it('should create an Upscaler instance with a custom model', async () => {
    const startingMemory = await getStartingMemory(page, prototypes);

    await page.evaluate(async (times) => {
      const Upscaler = window['Upscaler'];
      for (let i = 0; i < times; i++) {
        const upscaler = new Upscaler({
          model: {
            path: '/pixelator/pixelator.json',
            scale: 4,
          },
        });
        await upscaler.dispose();
      }
    }, TIMES_TO_CHECK);

    await tick(page);
    const endingMemory = await getMemory(page);
    const names = prototypes.map(p => p.name);
    checkMemory(names, startingMemory, endingMemory);
  });

  describe('Upscale with base64 output', () => {
    it('should upscale with no pre / post processing functions', async () => {
      const startingMemory = await getStartingMemory(page, prototypes);

      const image = await page.evaluate(async (times) => {
        const Upscaler = window['Upscaler'];
        let image;
        for (let i = 0; i < times; i++) {
          const upscaler = new Upscaler({
            model: {
              path: '/pixelator/pixelator.json',
              scale: 4,
            },
          });
          image = await upscaler.upscale(window['flower']);

          await upscaler.dispose();
        }
        return image;
      }, TIMES_TO_CHECK);

      await tick(page);
      const endingMemory = await getMemory(page);
      const names = prototypes.map(p => p.name);
      checkMemory(names, startingMemory, endingMemory);
      expect(image.substring(0,22)).toEqual('data:image/png;base64,');
    });

    it('should upscale with a pre and no post processing functions', async () => {
      const startingMemory = await getStartingMemory(page, prototypes);

      const image = await page.evaluate(async (times) => {
        const tf = window['tf'];
        const Upscaler = window['Upscaler'];
        let image;
        for (let i = 0; i < times; i++) {
          const upscaler = new Upscaler({
            model: {
              scale: 4,
              path: '/pixelator/pixelator.json',
              preprocess: (image) => tf.mul(image, 1),
            }
          });
          image = await upscaler.upscale(window['flower']);

          await upscaler.dispose();
        }
        return image;
      }, TIMES_TO_CHECK);

      await tick(page);
      const endingMemory = await getMemory(page);
      const names = prototypes.map(p => p.name);
      checkMemory(names, startingMemory, endingMemory);
      expect(image.substring(0,22)).toEqual('data:image/png;base64,');
    });
    
    it('should upscale with no pre and a post processing functions', async () => {
      const startingMemory = await getStartingMemory(page, prototypes);

      const image = await page.evaluate(async (times) => {
        const tf = window['tf'];
        const Upscaler = window['Upscaler'];
        let image;
        for (let i = 0; i < times; i++) {
          const upscaler = new Upscaler({
            model: {
              scale: 4,
              path: '/pixelator/pixelator.json',
              postprocess: (image) => tf.mul(image, 1),
            }
          });
          image = await upscaler.upscale(window['flower']);

          await upscaler.dispose();
        }
        return image;
      }, TIMES_TO_CHECK);

      await tick(page);
      const endingMemory = await getMemory(page);
      const names = prototypes.map(p => p.name);
      checkMemory(names, startingMemory, endingMemory);
      expect(image.substring(0,22)).toEqual('data:image/png;base64,');
    });

    it('should upscale with a pre and a post processing functions', async () => {
      const startingMemory = await getStartingMemory(page, prototypes);

      const image = await page.evaluate(async (times) => {
        const tf = window['tf'];
        const Upscaler = window['Upscaler'];
        let image;
        for (let i = 0; i < times; i++) {
          const upscaler = new Upscaler({
            model: {
              scale: 4,
              path: '/pixelator/pixelator.json',
              preprocess: (image) => tf.mul(image, 1),
              postprocess: (image) => tf.mul(image, 1),
            }
          });
          image = await upscaler.upscale(window['flower']);

          await upscaler.dispose();
        }
        return image;
      }, TIMES_TO_CHECK);

      await tick(page);
      const endingMemory = await getMemory(page);
      const names = prototypes.map(p => p.name);
      checkMemory(names, startingMemory, endingMemory);
      expect(image.substring(0,22)).toEqual('data:image/png;base64,');
    });
  });

  it('should upscale with a pre and a post processing functions into a tensor', async () => {
    const startingMemory = await getStartingMemory(page, prototypes);

    await page.evaluate(async (times) => {
      const tf = window['tf'];
      const Upscaler = window['Upscaler'];
      for (let i = 0; i < times; i++) {
        const upscaler = new Upscaler({
          model: {
            scale: 4,
            path: '/pixelator/pixelator.json',
            preprocess: (image) => tf.mul(image, 1),
            postprocess: (image) => tf.mul(image, 1),
          }
        });
        const tensor = await upscaler.upscale(window['flower'], {
          output: 'tensor',
        });

        tensor.dispose();

        await upscaler.dispose();
      }
    }, TIMES_TO_CHECK);

    await tick(page);
    const endingMemory = await getMemory(page);
    const names = prototypes.map(p => p.name);
    checkMemory(names, startingMemory, endingMemory);
  });

  it('should upscale with a pre and a post processing functions from a tensor', async () => {
    await page.evaluate(async () => {
      const getImage = (): Promise<HTMLImageElement> => new Promise(resolve => {
        const img = new Image();
        img.src = window['flower'];
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
      })
      const img = await getImage();
      window['src'] = await window['tf'].browser.fromPixels(img);
    });
    const startingMemory = await getStartingMemory(page, prototypes);

    const image = await page.evaluate(async (times) => {
      const tf = window['tf'];
      const Upscaler = window['Upscaler'];
      let output: string;
      for (let i = 0; i < times; i++) {
        const upscaler = new Upscaler({
          model: {
            scale: 4,
            path: '/pixelator/pixelator.json',
            preprocess: (image) => tf.mul(image, 1),
            postprocess: (image) => tf.mul(image, 1),
          }
        });
        output = await upscaler.upscale(window['src']);

        await upscaler.dispose();
      }
      return output;
    }, TIMES_TO_CHECK);

    await tick(page);
    const endingMemory = await getMemory(page);
    const names = prototypes.map(p => p.name);
    checkMemory(names, startingMemory, endingMemory);
    expect(image.substring(0,22)).toEqual('data:image/png;base64,');
    const isDisposed = await page.evaluate(async () => window['src'].isDisposed);
    expect(isDisposed).toEqual(false);
  });

  it('should upscale with a pre and a post processing functions with patch sizes', async () => {
    const startingMemory = await getStartingMemory(page, prototypes);
    const image = await page.evaluate(async (times) => {
      const tf = window['tf'];
      const Upscaler = window['Upscaler'];
      let output;
      for (let i = 0; i < times; i++) {
        const upscaler = new Upscaler({
          model: {
            scale: 4,
            path: '/pixelator/pixelator.json',
            preprocess: (image) => tf.mul(image, 1),
            postprocess: (image) => tf.mul(image, 1),
          }
        });
        output = await upscaler.upscale(window['flower'], {
          patchSize: 5,
        });

        await upscaler.dispose();
      }
      return output;
    }, TIMES_TO_CHECK);

    await tick(page);
    const endingMemory = await getMemory(page);
    const names = prototypes.map(p => p.name);
    checkMemory(names, startingMemory, endingMemory);
    expect(image.substring(0,22)).toEqual('data:image/png;base64,');
  });

  it('should upscale with the idealo model', async () => {
    const startingMemory = await getStartingMemory(page, prototypes);
    const image = await page.evaluate(async (times) => {
      const Upscaler = window['Upscaler'];
      const ESRGANGANS = window['esrgan-legacy']['gans'];
      let output;
      for (let i = 0; i < times; i++) {
        const upscaler = new Upscaler({
          model: ESRGANGANS,
        });
        output = await upscaler.upscale(window['flower']);

        await upscaler.dispose();
      }
      return output;
    }, TIMES_TO_CHECK);

    await tick(page);
    const endingMemory = await getMemory(page);
    const names = prototypes.map(p => p.name);
    checkMemory(names, startingMemory, endingMemory);
    expect(image.substring(0,22)).toEqual('data:image/png;base64,');
  });

  it('should callback to progress with a src', async () => {
    const startingMemory = await getStartingMemory(page, prototypes);
    const image = await page.evaluate(async (times) => {
      const Upscaler = window['Upscaler'];
      let output;
      for (let i = 0; i < times; i++) {
        const upscaler = new Upscaler({
          model: {
            path: '/pixelator/pixelator.json',
            scale: 4,
          },
        });
        await upscaler.upscale(window['flower'], {
          output: 'src',
          patchSize: 14,
          padding: 2,
          progress: (_, slice) => {
            output = slice;
          }
        });

        await upscaler.dispose();
      }
      return output;
    }, TIMES_TO_CHECK);

    await tick(page);
    const endingMemory = await getMemory(page);
    const names = prototypes.map(p => p.name);
    checkMemory(names, startingMemory, endingMemory);
    expect((image as string).substring(0,22)).toEqual('data:image/png;base64,');
  });

  it('should callback to progress with a tensor', async () => {
    const startingMemory = await getStartingMemory(page, prototypes);
    const image = await page.evaluate(async (times) => {
      const Upscaler = window['Upscaler'];
      let output: tf.Tensor;
      for (let i = 0; i < times; i++) {
        const upscaler = new Upscaler({
          model: {
            path: '/pixelator/pixelator.json',
            scale: 4,
          },
        });
        await upscaler.upscale(window['flower'], {
          output: 'src',
          progressOutput: 'tensor',
          patchSize: 14,
          padding: 2,
          progress: (rate, slice) => {
            if (output) {
              output.dispose();
            }
            output = slice;
          }
        });

        await upscaler.dispose();
      }
      window['output'] = output;
      return output;
    }, TIMES_TO_CHECK);

    await tick(page);
    expect(image.shape).toEqual([8, 8, 3]);
    await page.evaluate(() => {
      window['output'].dispose();
    })
    const endingMemory = await getMemory(page);
    const names = prototypes.map(p => p.name);
    checkMemory(names, startingMemory, endingMemory);
  });

  it('should cancel without leaking memory', async () => {
    const startingMemory = await getStartingMemory(page, prototypes);
    await page.evaluate((times) => new Promise(resolve => {
      const Upscaler = window['Upscaler'];
      const abortController = new AbortController();
      for (let i = 0; i < times; i++) {
        const upscaler = new Upscaler({
          model: {
            path: '/pixelator/pixelator.json',
            scale: 4,
          },
        });
        upscaler.upscale(window['flower'], {
          output: 'src',
          signal: abortController.signal,
        }).catch(() => {
          upscaler.dispose().then(resolve);
        });
        abortController.abort();
      }
    }), TIMES_TO_CHECK);

    await tick(page);
    const endingMemory = await getMemory(page);
    const names = prototypes.map(p => p.name);
    checkMemory(names, startingMemory, endingMemory);
  });

  it('should cancel without leaking memory with patch sizes', async () => {
    const startingMemory = await getStartingMemory(page, prototypes);
    await page.evaluate(async (times) => {
      const Upscaler = window['Upscaler'];
      const abortController = new AbortController();
      for (let i = 0; i < times; i++) {
        const upscaler = new Upscaler({
          model: {
            path: '/pixelator/pixelator.json',
            scale: 4,
          },
        });
        try {
          await upscaler.upscale(window['flower'], {
            output: 'src',
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
      }
    }, TIMES_TO_CHECK);

    await tick(page);
    const endingMemory = await getMemory(page);
    const names = prototypes.map(p => p.name);
    checkMemory(names, startingMemory, endingMemory);
  });

  it('should cancel without leaking memory with patch sizes and a tensor response', async () => {
    const startingMemory = await getStartingMemory(page, prototypes);
    await page.evaluate(async (times) => {
      const Upscaler = window['Upscaler'];
      const abortController = new AbortController();
      for (let i = 0; i < times; i++) {
        const upscaler = new Upscaler({
          model: {
            path: '/pixelator/pixelator.json',
            scale: 4,
          },
        });
        try {
          await upscaler.upscale(window['flower'], {
            output: 'tensor',
            signal: abortController.signal,
            patchSize: 14,
            padding: 2,
            progress: (rate, slice) => {
              (slice as unknown as tf.Tensor).dispose();
              if (rate >= .5) {
                abortController.abort();
              }
            }
          });
        } catch (err) { }

        await upscaler.dispose();
      }
    }, TIMES_TO_CHECK);

    await tick(page);
    const endingMemory = await getMemory(page);
    const names = prototypes.map(p => p.name);
    checkMemory(names, startingMemory, endingMemory);
  });
});

declare global {
  interface Window {
    Upscaler: typeof Upscaler;
    flower: string;
    tf: typeof tf;
    pixelUpsampler: ModelDefinition;
    src?: tf.Tensor4D | tf.Tensor3D;
    output?: tf.Tensor;
    'esrgan-legacy': Record<string, ModelDefinition>;
  }
}
