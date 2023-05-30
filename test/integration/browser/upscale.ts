/****
 * Tests that different supported image formats all upscale correctly.
 */
import { checkImage } from '../../lib/utils/checkImage';
import { ESBUILD_DIST, mockCDN as esbuildMockCDN } from '../../lib/esm-esbuild/prepare';
import * as tf from '@tensorflow/tfjs';
import Upscaler from 'upscaler';
import { BrowserTestRunner } from '../utils/BrowserTestRunner';
import path from 'path';
import { MODELS_DIR } from '../../../scripts/package-scripts/utils/constants';
import { MultiArgStringProgress, MultiArgTensorProgress } from '../../../packages/upscalerjs/src';

const PIXEL_UPSAMPLER_DIR = path.resolve(MODELS_DIR, 'pixel-upsampler/test/__fixtures__');

const TRACK_TIME = false;
const JEST_TIMEOUT = 60 * 1000;
const VERBOSE = false;
const USE_PNPM = `${process.env.USE_PNPM}` === '1';
jest.setTimeout(JEST_TIMEOUT); // 60 seconds timeout
jest.retryTimes(0);

describe('Upscale Integration Tests', () => {
  const testRunner = new BrowserTestRunner({
    mockCDN: esbuildMockCDN,
    dist: ESBUILD_DIST,
    trackTime: TRACK_TIME,
    verbose: VERBOSE,
    usePNPM: USE_PNPM,
  });
  const page = () => testRunner.page;

  beforeAll(async function beforeAll() {
    await testRunner.beforeAll();
  }, 60000);

  afterAll(async function modelAfterAll() {
    await testRunner.afterAll();
  }, 10000);

  beforeEach(async function beforeEach() {
    await testRunner.beforeEach('| Loaded');
  });

  afterEach(async function afterEach() {
    await testRunner.afterEach();
  });

  it("upscales an imported local image path", async () => {
    const result = await page().evaluate(() => {
      const upscaler = new window['Upscaler']({
        model: {
          path: '/models/pixel-upsampler/models/4x/4x.json',
          scale: 4,
          modelType: 'layers',
        },
      });
      return upscaler.execute(window['fixtures']['pixel-upsampler']);
    });
    checkImage(result, path.resolve(PIXEL_UPSAMPLER_DIR, "4x/result.png"), 'diff.png');
  });

  describe('Cancel', () => {
    it("cancels an inflight upscale request", async () => {
      const errMessage = await page().evaluate(() => new Promise(resolve => {
        const abortController = new AbortController();
        const patchSize = 7;
        const upscaler = new window['Upscaler']({
          model: {
            path: '/models/pixel-upsampler/models/4x/4x.json',
            scale: 4,
            modelType: 'layers',
          },
          warmupSizes: [{
            patchSize,
          }]
        });
        window['progressRates'] = [];
        window['called'] = false;

        let startTime = new Date().getTime();
        window['durations'] = [];
        upscaler.execute(window['fixtures']['pixel-upsampler'], {
          patchSize,
          padding: 2,
          output: 'base64',
          signal: abortController.signal,
          progress: (rate: number) => {
            const curTime = new Date().getTime();
            window['durations'].push(curTime - startTime);
            startTime = curTime;
            window['progressRates'].push(rate);
            if (rate >= .5) {
              abortController.abort();
            }
          },
        }).then(() => {
          window['called'] = true;
          resolve('this should not be called');
        }).catch((err: Error) => {
          return resolve(err.message);
        });
      }));
      expect(errMessage).toEqual('The upscale request received an abort signal');
      const [progressRates, called] = await page().evaluate((): Promise<[number[], boolean]> => new Promise(resolve => {
        const durations = window['durations'].slice(1); // skip the first entry, it's usually slower than the others
        const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length;
        setTimeout(() => {
          resolve([
            window['progressRates'],
            window['called'],
          ]);
        }, avg * 2); // wait the average time for a progress event, PLUS another, to make sure we catch any stray calls
      }));
      const expectedRates = Array(8).fill('').map((_, i) => (i + 1) / 16);
      expect(progressRates).toEqual(expectedRates);
      expect(called).toEqual(false);
    });

    it("cancels all inflight upscale requests", async () => {
      const errMessage = await page().evaluate(() => new Promise(resolve => {
        const patchSize = 7;
        const upscaler = new window['Upscaler']({
          model: {
            path: '/models/pixel-upsampler/models/4x/4x.json',
            scale: 4,
            modelType: 'layers',
          },
          warmupSizes: [{
            patchSize,
          }]
        });
        window['progressRates'] = [];
        window['called'] = false;

        let startTime = new Date().getTime();
        window['durations'] = [];
        const options: any = {
          patchSize,
          padding: 2,
          output: 'base64',
          awaitNextFrame: true,
          progress: (rate: number) => {
            const curTime = new Date().getTime();
            window['durations'].push(curTime - startTime);
            startTime = curTime;
            window['progressRates'].push(rate);
            if (rate >= .5) {
              upscaler.abort();
            }
          },
        };
        Array(3).fill('').forEach(() => {
          upscaler.execute(window['fixtures']['pixel-upsampler'], options).then(() => {
            window['called'] = true;
            resolve('this should not be called');
          }).catch((err: Error) => {
            return resolve(err.message);
          });
        })
      }));
      expect(errMessage).toEqual('The upscale request received an abort signal');
      const [progressRates, called] = await page().evaluate((): Promise<[number[], boolean]> => new Promise(resolve => {
        const durations = window['durations'].slice(1); // skip the first entry, it's usually slower than the others
        const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length;
        setTimeout(() => {
          resolve([
            window['progressRates'],
            window['called'],
          ]);
        }, avg * 2); // wait the average time for a progress event, PLUS another, to make sure we catch any stray calls
      }));
      const expectedRates = Array(7).fill('').map((_, i) => (i + 1) / 16).reduce((arr, el) => {
        return arr.concat([el, el, el]);
      }, [] as Array<number>).concat([.5]);
      expect(progressRates).toEqual(expectedRates);
      expect(called).toEqual(false);
    });

    it("can cancel all inflight upscale requests and then make a new request successfully", async () => {
      const errMessage = await page().evaluate(() => new Promise(resolve => {
        const patchSize = 7;
        window['upscaler'] = new window['Upscaler']({
          model: {
            path: '/models/pixel-upsampler/models/4x/4x.json',
            scale: 4,
            modelType: 'layers',
          },
          warmupSizes: [{
            patchSize,
          }]
        });

        const options: any = {
          patchSize,
          padding: 2,
          output: 'base64',
          progress: (rate: number) => {
            if (rate >= .5) {
              window['upscaler'].abort();
            }
          },
        };
        window['upscaler'].execute(window['fixtures']['pixel-upsampler'], options).then(() => {
          window['called'] = true;
          resolve('this should not be called');
        }).catch((err: Error) => {
          return resolve(err.message);
        });
      }));
      expect(errMessage).toEqual('The upscale request received an abort signal');

      const result = await page().evaluate(() => {
        return window['upscaler'].execute(window['fixtures']['pixel-upsampler']);
      });
      checkImage(result, path.resolve(PIXEL_UPSAMPLER_DIR, "4x/result.png"), 'diff.png');
    });
  });

  describe('Progress Method', () => {
    it("calls back to progress the correct number of times", async () => {
      const progressRates = await page().evaluate(() => new Promise(resolve => {
        const upscaler = new window['Upscaler']({
          model: {
            path: '/models/pixel-upsampler/models/4x/4x.json',
            scale: 4,
            modelType: 'layers',
          },
        });
        const progressRates: Array<number> = [];
        upscaler.execute(window['fixtures']['pixel-upsampler'], {
          patchSize: 10,
          padding: 2,
          output: 'base64',
          progress: (rate: number) => {
            progressRates.push(rate);
          },
        }).then(() => {
          resolve(progressRates);
        });
      }));
      expect(progressRates).toEqual([.25, .5, .75, 1]);
    });

    it("calls back to progress with a base64", async () => {
      const [rate, slice] = await page().evaluate((): Promise<[number, string]> => new Promise(resolve => {
        const upscaler = new window['Upscaler']({
          model: {
            path: '/models/pixel-upsampler/models/4x/4x.json',
            scale: 4,
            modelType: 'layers',
          },
        });
        const progress: MultiArgStringProgress = (rate, slice) => {
          resolve([rate, slice]);
        };
        upscaler.execute(window['fixtures']['pixel-upsampler'], {
          patchSize: 14,
          padding: 2,
          output: 'base64',
          progress,
        });
      }));
      expect(typeof rate).toEqual('number');
      checkImage(slice, path.resolve(PIXEL_UPSAMPLER_DIR, "4x/slice-patchsize-12-padding-2.png"), 'diff.png');
    });

    test.each([
      // image is 16, so expected final size of 32
      [12, 0, [
        [.25, [24, 24, 3]],
        [.5, [24, 8, 3]],
        [.75, [8, 24, 3]],
        [1, [8, 8, 3]],
      ]],
      [12, 1, [
        [.25, [22, 22, 3]],
        [.5, [22, 10, 3]],
        [.75, [10, 22, 3]],
        [1, [10, 10, 3]],
      ]],
      [12, 2, [
        [.25, [20, 20, 3]],
        [.5, [20, 12, 3]],
        [.75, [12, 20, 3]],
        [1, [12, 12, 3]],
      ]],
      [10, 2, [
        [.25, [16, 16, 3]],
        [.5, [16, 16, 3]],
        [.75, [16, 16, 3]],
        [1, [16, 16, 3]],
      ]],
      [9, 2, [
        [1 / 9, [14, 14, 3]],
        [2 / 9, [14, 10, 3]],
        [3 / 9, [14, 8, 3]],
        [4 / 9, [10, 14, 3]],
        [5 / 9, [10, 10, 3]],
        [6 / 9, [10, 8, 3]],
        [7 / 9, [8, 14, 3]],
        [8 / 9, [8, 10, 3]],
        [9 / 9, [8, 8, 3]],
      ]],
    ])(
      "calls back to progress with a tensor | patch size: %i | padding: %i",
      async (patchSize, padding, expectation,) => {
        const updates = await page().evaluate(({ patchSize, padding }): Promise<[number, number[]][]> => new Promise(resolve => {
          const upscaler = new window['Upscaler']({
            model: {
              path: '/models/pixel-upsampler/models/2x/2x.json',
              scale: 2,
              modelType: 'layers',
            },
          });
          const updates: [number, number[]][] = [];
          const progress: MultiArgTensorProgress = (rate, slice) => {
            updates.push([rate, slice.shape])
          };
          upscaler.execute(window['fixtures']['pixel-upsampler'], {
            patchSize,
            padding,
            output: 'tensor',
            progress,
          }).then(() => {
            resolve(updates);
          });
        }), { patchSize, padding });
        expect(updates).toEqual(expectation);
      });

    it("calls back to progress with a row and col", async () => {
      const progressRates = await page().evaluate((): Promise<Array<[number, number]>> => new Promise(resolve => {
        const upscaler = new window['Upscaler']({
          model: {
            path: '/models/pixel-upsampler/models/2x/2x.json',
            scale: 2,
            modelType: 'layers',
          },
        });
        const progressRates: Array<[number, number]> = [];
        const progress: MultiArgStringProgress = (rate, slice, row, col) => {
          progressRates.push([row, col]);
        };
        upscaler.execute(window['fixtures']['pixel-upsampler'], {
          patchSize: 8,
          padding: 0,
          progress,
        }).then(() => {
          resolve(progressRates)
        });
      }));
      expect(progressRates).toEqual([
        [0, 0],
        [0, 1],
        [1, 0],
        [1, 1],
      ]);
    });
  });
});

declare global {
  interface Window {
    Upscaler: typeof Upscaler;
    upscaler: Upscaler;
    fixtures: Record<string, string>;
    tf: typeof tf;
    called: boolean;
    durations: Array<any>;
    progressRates: Array<number>;
  }
}
