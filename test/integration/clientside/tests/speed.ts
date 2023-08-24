/****
 * Tests that different approaches to loading a model all load correctly
 */
import Upscaler, { ModelDefinition } from 'upscaler';
import * as tf from '@tensorflow/tfjs';
import type { Page } from 'puppeteer';
import path from 'path';
import { ClientsideTestRunner } from '@internals/test-runner/clientside';
import { MODELS_DIR } from '@internals/common/constants';
import { verbose } from '@internals/common/logger';

const TRACK_TIME = false;
const LOWER_THRESHOLD = 40; // in milliseconds
let UPPER_THRESHOLD = 20; // in milliseconds
const DATE_AT_WHICH_SPEED_TESTS_TAKE_EFFECT = new Date('December 1, 2023 00:00:00');
const SHOULD_TAKE_EFFECT = new Date().getTime() > DATE_AT_WHICH_SPEED_TESTS_TAKE_EFFECT.getTime();
if (!SHOULD_TAKE_EFFECT) {
  UPPER_THRESHOLD *= 10;
}

const ROOT_BUNDLER_OUTPUT_DIR = process.env.ROOT_BUNDLER_OUTPUT_DIR;
if (typeof ROOT_BUNDLER_OUTPUT_DIR !== 'string') {
  throw new Error('ROOT_BUNDLER_OUTPUT_DIR not defined in env');
}
const ESBUILD_DIST_FOLDER = path.resolve(ROOT_BUNDLER_OUTPUT_DIR, 'esbuild/dist');

describe('Speed Integration Tests', () => {
  const testRunner = new ClientsideTestRunner({
    mock: true,
    dist: ESBUILD_DIST_FOLDER,
    trackTime: TRACK_TIME,
    log: true,
  });
  let pages: Page[] = [];

  let fixtureServerURL: string = '';

  beforeAll(async function beforeAll() {
    await testRunner.beforeAll();
    fixtureServerURL = await testRunner.getFixturesServerURL();
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

  const runTest = async (packageName: string, modelName: string, patchSize?: number, padding?: number) => {
    const times = 1;
    const durations = await Promise.all(Array(times).fill('').map(async () => {
      const context = await testRunner.browser.createIncognitoBrowserContext();
      const page = await context.newPage();
      pages.push(page);
      await page.goto(await testRunner.getServerURL());
      const modelPath = `@upscalerjs/${packageName}/${modelName}`;
      const fixturePath = `${fixtureServerURL}/${packageName}/test/__fixtures__/fixture.png`;
      return page.evaluate(async ({ modelPath, fixturePath, patchSize, padding }) => {
        const tf = window['tf'];
        const upscaler = new window['Upscaler']({
          model: window[modelPath],
        });
        const waitForImage = (src: string): Promise<HTMLImageElement> => new Promise(imgresolve => {
          const img = new Image();
          img.src = src;
          img.crossOrigin = 'anonymous';
          img.onload = () => imgresolve(img);
        });
        const img = await waitForImage(fixturePath);
        const fixturePixels = tf.browser.fromPixels(img).expandDims(0) as tf.Tensor4D;
        const [{ model }] = await Promise.all([
          upscaler.getModel(),
          upscaler.warmup([{
            patchSize: patchSize || img.width,
            padding: padding || 0,
          }]),
        ]);
        const durations = [];
        for (const fn of [
          () => model.predict(fixturePixels),
          () => upscaler.execute(fixturePixels, {
            output: 'tensor',
            patchSize,
            padding,
          }),
        ]) {
          let output: undefined | tf.Tensor;
          let start = performance.now();
          output = await fn();
          durations.push(performance.now() - start);
          output?.dispose();
        }
        return durations;
      }, { fixturePath, modelPath, patchSize, padding });
    }));
    let rawDuration = 0;
    let upscalerJSDuration = 0;
    for (const [raw, upscalerJS] of durations) {
      rawDuration += raw;
      upscalerJSDuration += upscalerJS;
    }

    rawDuration /= times;
    upscalerJSDuration /= times;

    expect(upscalerJSDuration).toBeWithin([rawDuration, LOWER_THRESHOLD, UPPER_THRESHOLD]);
  };

  describe.each([
    [
      'Pixel Upsampler',
      'pixel-upsampler',
      '4x',
    ],
    // [
    //   'GANS',
    //   'esrgan-legacy',
    //   'gans',
    // ],
  ])("%s", async (_label, packageName, modelName) => {
    it.only('ensures that UpscalerJS does not add significant additional latency as compared to running the model directly', () => runTest(
      packageName,
      modelName,
    ));
    it.only('ensures that UpscalerJS does not add significant additional latency as compared to running the model directly with patch sizes', () => runTest(
      packageName,
      modelName,
      8,
      0,
    ));
  });
});

declare global {
  interface Window {
    Upscaler: typeof Upscaler;
    fixtures: Record<string, string>;
    tf: typeof tf;
    'pixel-upsampler': Record<string, ModelDefinition>;
    'esrgan-legacy': Record<string, ModelDefinition>;
    PixelUpsampler2x: ModelDefinition;
  }
  namespace jest {
    interface Matchers<R> {
      toBeWithin: (expected: [number, number, number]) => CustomMatcherResult;
    }
  }
}
