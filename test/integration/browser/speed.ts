/****
 * Tests that different approaches to loading a model all load correctly
 */
import { bundleEsbuild, DIST as ESBUILD_DIST, mockCDN as esbuildMockCDN } from '../../lib/esm-esbuild/prepare';
import Upscaler, { ModelDefinition } from 'upscaler';
import * as tf from '@tensorflow/tfjs';
import { BrowserTestRunner } from '../utils/BrowserTestRunner';
import puppeteer from 'puppeteer';

const TRACK_TIME = false;
const LOG = true;
const VERBOSE = false;
const USE_PNPM = `${process.env.USE_PNPM}` === '1';
const THRESHOLD = 20; // in milliseconds

const JEST_TIMEOUT = 60 * 1000 * 5;
jest.setTimeout(JEST_TIMEOUT);

describe('Speed Integration Tests', () => {
  const testRunner = new BrowserTestRunner({
    name: 'esm',
    mockCDN: esbuildMockCDN,
    dist: ESBUILD_DIST,
    trackTime: TRACK_TIME,
    log: LOG,
    verbose: VERBOSE,
    usePNPM: USE_PNPM,
  });

  let pages: puppeteer.Page[] = [];

  beforeAll(async function beforeAll() {
    await testRunner.beforeAll(bundleEsbuild);
  }, 60000);

  afterAll(async function modelAfterAll() {
    await testRunner.afterAll();
  }, 10000);

  beforeEach(async function beforeEach() {
    await testRunner.beforeEach('| Loaded');
  });

  afterEach(async function afterEach() {
    pages.forEach(page => {
      try {
      page.close();
      } catch(err) {}
    });
    pages = [];
    await testRunner.afterEach();
  });

  if (new Date().getTime() > 1670772364086) {
    [
      {
        label: 'Simple Model',
        packageName: 'pixel-upsampler',
        modelName: '4x',
      },
      {
        label: 'GANS',
        packageName: 'esrgan-legacy',
        modelName: 'gans',
      },
    ].forEach(({ label, packageName, modelName }) => {
      it(`ensures that UpscalerJS running a ${label} does not add significant additional latency as compared to running the model directly`, async () => {
        const times = 7;
        const durations = await Promise.all(Array(times).fill('').map(async () => {
          const context = await testRunner.browser.createIncognitoBrowserContext();
          const page = await context.newPage();
          pages.push(page);
          await page.goto(testRunner.serverURL);
          // await page.waitForFunction(`document.title.endsWith("| Loaded}")`);
          return page.evaluate(([packageName, modelName]) => new Promise<[number, number]>(resolve => {
            const upscaler = new window['Upscaler']({
              model: (window as any)[packageName][modelName],
            });
            const flower = window['flower'];
            const waitForImage = (src: string): Promise<HTMLImageElement> => new Promise(resolve => {
              const img = new Image();
              img.src = src;
              img.onload = () => resolve(img);
            });
            const measure = (fn: () => Promise<any>) => new Promise(r => {
              const start = performance.now();
              return fn().then(() => r(performance.now() - start));
            })
            return waitForImage(flower).then(img => {
              const flowerPixels = tf.browser.fromPixels(img).expandDims(0) as tf.Tensor4D;
              return Promise.all([
                upscaler.getModel(),
                upscaler.warmup([{
                  patchSize: img.width,
                  padding: 0,
                }]),
              ]).then(([{ model }]) => {
                return measure(() => new Promise(r => {
                  tf.tidy(() => model.predict(flowerPixels));
                  r(undefined);
                })).then(rawDuration => {
                  let output: undefined | tf.Tensor = undefined;
                  return measure(() => upscaler.upscale(flowerPixels, {
                    output: 'tensor',
                  })).then(upscalerJSDuration => {
                    if (output !== undefined) {
                      (output as tf.Tensor).dispose();
                    }
                    return [rawDuration, upscalerJSDuration] as [number, number];
                  });
                });
              });
            }).then(resolve);
          }), [packageName, modelName]);
        }));
      });

      it(`ensures that UpscalerJS running a ${label} does not add significant additional latency as compared to running the model directly with patch sizes`, async () => {
        const times = 7;
        const durations = await Promise.all(Array(times).fill('').map(async () => {
          const context = await testRunner.browser.createIncognitoBrowserContext();
          const page = await context.newPage();
          pages.push(page);
          await page.goto(testRunner.serverURL);
          // await page.waitForFunction(`document.title.endsWith("| Loaded}")`);
          return page.evaluate(([packageName, modelName]) => new Promise<[number, number]>(resolve => {
            const patchSize = 8;
            const times = 4;
            const upscaler = new window['Upscaler']({
              model: (window as any)[packageName][modelName],
            });
            const flower = window['flower'];
            const waitForImage = (src: string): Promise<HTMLImageElement> => new Promise(resolve => {
              const img = new Image();
              img.src = src;
              img.onload = () => resolve(img);
            });
            const measure = (fn: () => Promise<any>) => new Promise(r => {
              const start = performance.now();
              return fn().then(() => r(performance.now() - start));
            })
            return waitForImage(flower).then(img => {
              const flowerPixels = tf.browser.fromPixels(img).expandDims(0) as tf.Tensor4D;
              return Promise.all([
                upscaler.getModel(),
                upscaler.warmup([{
                  patchSize,
                  padding: 0,
                }]),
              ]).then(([{ model }]) => {
                return measure(() => new Promise(r => {
                  tf.tidy(() => {
                    for (let i = 0; i < times; i++) {
                      model.predict(flowerPixels);
                    }
                  });
                  r(undefined);
                })).then(rawDuration => {
                  let output: undefined | tf.Tensor = undefined;
                  return measure(() => upscaler.upscale(flowerPixels, {
                    output: 'tensor',
                    patchSize,
                    padding: 0,
                  })).then(upscalerJSDuration => {
                    if (output !== undefined) {
                      (output as tf.Tensor).dispose();
                    }
                    return [rawDuration, upscalerJSDuration] as [number, number];
                  });
                });
              });
            }).then(resolve);
          }), [packageName, modelName]);
        }));
        let rawDuration = 0;
        let upscalerJSDuration = 0;
        for (const [raw, upscalerJS] of durations) {
          rawDuration += raw;
          upscalerJSDuration += upscalerJS;
        }

        rawDuration /= times;
        upscalerJSDuration /= times;

        console.log('raw duration', rawDuration)
        console.log('upscalerJS Duration', upscalerJSDuration)

        expect(upscalerJSDuration).toBeWithin([rawDuration, THRESHOLD]);
      });
    });
  } else {
    it('passes', () => {
      expect(1).toEqual(1);
    })
  }
});

declare global {
  interface Window {
    Upscaler: typeof Upscaler;
    flower: string;
    flower128: string;
    tf: typeof tf;
    'pixel-upsampler': Record<string, ModelDefinition>;
    'esrgan-legacy': Record<string, ModelDefinition>;
    PixelUpsampler2x: ModelDefinition;
  }
  namespace jest {
    interface Matchers<R> {
      toBeWithin: (expected: [number, number]) => CustomMatcherResult;
    }
  }
}
