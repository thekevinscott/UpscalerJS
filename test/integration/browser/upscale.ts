/****
 * Tests that different supported image formats all upscale correctly.
 */
import { checkImage } from '../../lib/utils/checkImage';
import { bundle, DIST, mockCDN as esbuildMockCDN } from '../../lib/esm-esbuild/prepare';
import * as tf from '@tensorflow/tfjs';
import Upscaler, { Progress } from 'upscaler';
import { BrowserTestRunner } from '../utils/BrowserTestRunner';

const TRACK_TIME = false;
const JEST_TIMEOUT = 60 * 1000;
jest.setTimeout(JEST_TIMEOUT); // 60 seconds timeout
jest.retryTimes(0);

describe('Upscale Integration Tests', () => {
  const testRunner = new BrowserTestRunner({
    mockCDN: esbuildMockCDN,
    dist: DIST,
    trackTime: TRACK_TIME,
  });
  const page = () => testRunner.page;

  beforeAll(async function beforeAll() {
    await testRunner.beforeAll(bundle);
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
          path: '/pixelator/pixelator.json',
          scale: 4,
        },
      });
      return upscaler.upscale(window['flower']);
    });
    checkImage(result, "upscaled-4x-pixelator.png", 'diff.png');
  });

  describe('Cancel', () => {
    it("cancels an inflight upscale request", async () => {
      const errMessage = await page().evaluate(() => new Promise(resolve => {
        const abortController = new AbortController();
        const upscaler = new window['Upscaler']({
          model: {
            path: '/pixelator/pixelator.json',
            scale: 4,
          },
          warmupSizes: [{
            patchSize: 4,
            padding: 2,
          }]
        });
        window['progressRates'] = [];
        window['called'] = false;

        let startTime = new Date().getTime();
        window['durations'] = [];
        upscaler.upscale(window['flower'], {
          patchSize: 4,
          padding: 2,
          output: 'src',
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
        const upscaler = new window['Upscaler']({
          model: {
            path: '/pixelator/pixelator.json',
            scale: 4,
          },
          warmupSizes: [{
            patchSize: 4,
            padding: 2,
          }]
        });
        window['progressRates'] = [];
        window['called'] = false;

        let startTime = new Date().getTime();
        window['durations'] = [];
        const options: any = {
          patchSize: 4,
          padding: 2,
          output: 'src',
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
          upscaler.upscale(window['flower'], options).then(() => {
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
        window['upscaler'] = new window['Upscaler']({
          model: {
            path: '/pixelator/pixelator.json',
            scale: 4,
          },
          warmupSizes: [{
            patchSize: 4,
            padding: 2,
          }]
        });

        const options: any = {
          patchSize: 4,
          padding: 2,
          output: 'src',
          progress: (rate: number) => {
            if (rate >= .5) {
              window['upscaler'].abort();
            }
          },
        };
        window['upscaler'].upscale(window['flower'], options).then(() => {
          window['called'] = true;
          resolve('this should not be called');
        }).catch((err: Error) => {
          return resolve(err.message);
        });
      }));
      expect(errMessage).toEqual('The upscale request received an abort signal');

      const result = await page().evaluate(() => {
        return window['upscaler'].upscale(window['flower']);
      });
      checkImage(result, "upscaled-4x-pixelator.png", 'diff.png');
    });
  });

  describe('Progress Method', () => {
    it("calls back to progress the correct number of times", async () => {
      const progressRates = await page().evaluate(() => new Promise(resolve => {
        const upscaler = new window['Upscaler']({
          model: {
            path: '/pixelator/pixelator.json',
            scale: 4,
          },
        });
        const progressRates: Array<number> = [];
        upscaler.upscale(window['flower'], {
          patchSize: 8,
          padding: 2,
          output: 'src',
          progress: (rate: number) => {
            progressRates.push(rate);
          },
        }).then(() => {
          resolve(progressRates);
        });
      }));
      expect(progressRates).toEqual([.25, .5, .75, 1]);
    });

    it("calls back to progress with a src", async () => {
      const [rate, slice] = await page().evaluate((): Promise<[number, string]> => new Promise(resolve => {
        const upscaler = new window['Upscaler']({
          model: {
            path: '/pixelator/pixelator.json',
            scale: 4,
          },
        });
        const progress: Progress<'src'> = (rate, slice) => {
          resolve([rate, slice]);
        };
        upscaler.upscale(window['flower'], {
          patchSize: 12,
          padding: 2,
          output: 'src',
          progress,
        });
      }));
      expect(typeof rate).toEqual('number');
      checkImage(slice, "slice-patchsize-12-padding-2.png", 'diff.png');
    });

    it("calls back to progress with a tensor", async () => {
      const [rate, slice] = await page().evaluate((): Promise<[number, tf.Tensor]> => new Promise(resolve => {
        const upscaler = new window['Upscaler']({
          model: {
            path: '/pixelator/pixelator.json',
            scale: 4,
          },
        });
        const progress: Progress<'tensor'> = (rate, slice) => {
          // TODO: Figure out why slice is not being typed as a tensor
          resolve([rate, slice as unknown as tf.Tensor]);
        };
        upscaler.upscale(window['flower'], {
          patchSize: 12,
          padding: 2,
          output: 'tensor',
          progress,
        });
      }));
      expect(typeof rate).toEqual('number');
      expect(slice.shape).toEqual([48, 48, 3]);
    });
  });
});

declare global {
  interface Window {
    Upscaler: typeof Upscaler;
    upscaler: Upscaler;
    flower: string;
    tf: typeof tf;
    called: boolean;
    durations: Array<any>;
    progressRates: Array<number>;
  }
}
