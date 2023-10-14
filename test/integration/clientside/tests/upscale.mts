/****
 * Tests that different supported image formats all upscale correctly.
 */
import { checkImage } from '../../../lib/utils/checkImage.js';
import * as tf from '@tensorflow/tfjs';
import Upscaler from 'upscaler';
import path from 'path';
import { MODELS_DIR } from '@internals/common/constants';
import { MultiArgStringProgress, MultiArgTensorProgress } from '../../../../packages/upscalerjs/src/shared/index.js';
import { ClientsideTestRunner } from '@internals/test-runner/clientside';

const PIXEL_UPSAMPLER_DIR = path.resolve(MODELS_DIR, 'pixel-upsampler/test/__fixtures__');

const ROOT_BUNDLER_OUTPUT_DIR = process.env.ROOT_BUNDLER_OUTPUT_DIR;
if (typeof ROOT_BUNDLER_OUTPUT_DIR !== 'string') {
  throw new Error('ROOT_BUNDLER_OUTPUT_DIR not defined in env');
}
const ESBUILD_DIST = path.resolve(ROOT_BUNDLER_OUTPUT_DIR, 'esbuild/dist')

describe('Upscale Integration Tests', () => {
  const testRunner = new ClientsideTestRunner({
    mock: true,
    dist: ESBUILD_DIST,
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
    const fixturePath = `${await testRunner.getFixturesServerURL()}/pixel-upsampler/test/__fixtures__/fixture.png`;
    const result = await page().evaluate(({ fixturePath, }) => {
      const model = window["@upscalerjs/pixel-upsampler/x4"];
      if (!model) {
        throw new Error('No model found');
      }
      const upscaler = new window['Upscaler']({
        model,
      });
      return upscaler.execute(fixturePath);
    }, { fixturePath });
    checkImage(result, path.resolve(PIXEL_UPSAMPLER_DIR, "x4/result.png"), 'diff.png');
  });

  describe('Cancel', () => {
    it("cancels an inflight upscale request", async () => {
      const fixturePath = `${await testRunner.getFixturesServerURL()}/pixel-upsampler/test/__fixtures__/fixture.png`;
      const errMessage = await page().evaluate(({ fixturePath, }) => new Promise(resolve => {
        const abortController = new AbortController();
        const patchSize = 7;
        const model = window["@upscalerjs/pixel-upsampler/x4"];
        if (!model) {
          throw new Error('No model found');
        }
        const upscaler = new window['Upscaler']({
          model,
          warmupSizes: [{
            patchSize,
          }]
        });
        window['progressRates'] = [];
        window['called'] = false;

        let startTime = new Date().getTime();
        window['durations'] = [];
        upscaler.execute(fixturePath, {
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
      }), { fixturePath });
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
      const fixturePath = `${await testRunner.getFixturesServerURL()}/pixel-upsampler/test/__fixtures__/fixture.png`;
      const errMessage = await page().evaluate(({ fixturePath }) => new Promise(resolve => {
        const patchSize = 7;
        const model = window["@upscalerjs/pixel-upsampler/x4"];
        if (!model) {
          throw new Error('No model found');
        }
        const upscaler = new window['Upscaler']({
          model,
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
          upscaler.execute(fixturePath, options).then(() => {
            window['called'] = true;
            resolve('this should not be called');
          }).catch((err: Error) => {
            return resolve(err.message);
          });
        })
      }), { fixturePath, });
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
      const fixturePath = `${await testRunner.getFixturesServerURL()}/pixel-upsampler/test/__fixtures__/fixture.png`;
      const errMessage = await page().evaluate(({ fixturePath }) => new Promise(resolve => {
        const patchSize = 7;
        const model = window["@upscalerjs/pixel-upsampler/x4"];
        if (!model) {
          throw new Error('No model found');
        }
        window['upscaler'] = new window['Upscaler']({
          model,
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
        upscaler.execute(fixturePath, options).then(() => {
          window['called'] = true;
          resolve('this should not be called');
        }).catch((err: Error) => {
          return resolve(err.message);
        });
      }), { fixturePath });
      expect(errMessage).toEqual('The upscale request received an abort signal');

      const result = await page().evaluate((fixturePath) => {
        return window['upscaler'].execute(fixturePath);
      }, fixturePath);
      checkImage(result, path.resolve(PIXEL_UPSAMPLER_DIR, "x4/result.png"), 'diff.png');
    });
  });

  describe('Progress Method', () => {
    it("calls back to progress the correct number of times", async () => {
      const fixturePath = `${await testRunner.getFixturesServerURL()}/pixel-upsampler/test/__fixtures__/fixture.png`;
      const progressRates = await page().evaluate(({ fixturePath }) => new Promise(resolve => {
        const model = window["@upscalerjs/pixel-upsampler/x4"];
        if (!model) {
          throw new Error('No model found');
        }
        const upscaler = new window['Upscaler']({
          model,
        });
        const progressRates: Array<number> = [];
        upscaler.execute(fixturePath, {
          patchSize: 10,
          padding: 2,
          output: 'base64',
          progress: (rate: number) => {
            progressRates.push(rate);
          },
        }).then(() => {
          resolve(progressRates);
        });
      }), { fixturePath });
      expect(progressRates).toEqual([.25, .5, .75, 1]);
    });

    it("calls back to progress with a base64", async () => {
      const fixturePath = `${await testRunner.getFixturesServerURL()}/pixel-upsampler/test/__fixtures__/fixture.png`;
      const [rate, slice] = await page().evaluate(({ fixturePath }): Promise<[number, string]> => new Promise(resolve => {
        const model = window["@upscalerjs/pixel-upsampler/x4"];
        if (!model) {
          throw new Error('No model found');
        }
        const upscaler = new window['Upscaler']({
          model,
        });
        const progress: MultiArgStringProgress = (rate, slice) => {
          resolve([rate, slice]);
        };
        upscaler.execute(fixturePath, {
          patchSize: 14,
          padding: 2,
          output: 'base64',
          progress,
        });
      }), { fixturePath, });
      expect(typeof rate).toEqual('number');
      checkImage(slice, path.resolve(PIXEL_UPSAMPLER_DIR, "x4/slice-patchsize-12-padding-2.png"), 'diff.png');
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
        const fixturePath = `${await testRunner.getFixturesServerURL()}/pixel-upsampler/test/__fixtures__/fixture.png`;
        const updates = await page().evaluate(({ fixturePath, patchSize, padding }): Promise<[number, number[]][]> => new Promise(resolve => {
          const upscaler = new window['Upscaler']({
            model: window['PixelUpsampler2x'],
          });
          const updates: [number, number[]][] = [];
          const progress: MultiArgTensorProgress = (rate, slice) => {
            updates.push([rate, slice.shape])
          };
          upscaler.execute(fixturePath, {
            patchSize,
            padding,
            output: 'tensor',
            progress,
          }).then(() => {
            resolve(updates);
          });
        }), { fixturePath, patchSize, padding });
        expect(updates).toEqual(expectation);
      });

    it("calls back to progress with a row and col", async () => {
      const fixturePath = `${await testRunner.getFixturesServerURL()}/pixel-upsampler/test/__fixtures__/fixture.png`;
      const progressRates = await page().evaluate(({ fixturePath }): Promise<Array<[number, number]>> => new Promise(resolve => {
        const upscaler = new window['Upscaler']({
          model: window['PixelUpsampler2x'],
        });
        const progressRates: Array<[number, number]> = [];
        const progress: MultiArgStringProgress = (rate, slice, { row, col }) => {
          progressRates.push([row, col]);
        };
        upscaler.execute(fixturePath, {
          patchSize: 8,
          padding: 0,
          progress,
        }).then(() => {
          resolve(progressRates)
        });
      }), { fixturePath });

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
    // upscaler: Upscaler;
    fixtures: Record<string, string>;
    tf: typeof tf;
    called: boolean;
    durations: Array<any>;
    progressRates: Array<number>;
  }
}
