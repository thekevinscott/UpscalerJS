/****
 * Tests that different approaches to loading a model all load correctly
 */
import { checkImage } from '../../lib/utils/checkImage';
import { ESBUILD_DIST as ESBUILD_DIST, mockCDN as esbuildMockCDN } from '../../lib/esm-esbuild/prepare';
import Upscaler, { ModelDefinition } from 'upscaler';
import * as tf from '@tensorflow/tfjs';
import type { Tensor3D, } from '@tensorflow/tfjs';
import * as tfn from '@tensorflow/tfjs-node';
import { BrowserTestRunner } from '@internals/test-runner/browser';
import path from 'path';
import { MODELS_DIR } from '../../../scripts/package-scripts/utils/constants';

const PIXEL_UPSAMPLER_DIR = path.resolve(MODELS_DIR, 'pixel-upsampler/test/__fixtures__');
const DEFAULT_MODEL_DIR = path.resolve(MODELS_DIR, 'default-model/test/__fixtures__');

const TRACK_TIME = false;
const LOG = true;
const VERBOSE = false;
const USE_PNPM = `${process.env.USE_PNPM}` === '1';
const JEST_TIMEOUT = 60 * 1000 * 15;
jest.setTimeout(JEST_TIMEOUT); // 5 minute timeout per test
jest.retryTimes(0);

describe('Model Loading Integration Tests', () => {
  const testRunner = new BrowserTestRunner({
    name: 'esm',
    mockCDN: esbuildMockCDN,
    dist: ESBUILD_DIST,
    trackTime: TRACK_TIME,
    log: LOG,
    verbose: VERBOSE,
    usePNPM: USE_PNPM,
  });
  const page = () => testRunner.page;

  beforeAll(async function beforeAll() {
    await testRunner.beforeAll();
  }, 60000);

  afterAll(async function afterAll() {
    await testRunner.afterAll();
  }, 10000);

  beforeEach(async function beforeEach() {
    await testRunner.beforeEach('| Loaded');
  });

  afterEach(async function afterEach() {
    await testRunner.afterEach();
  });

  it("loads the default model", async () => {
    const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    await wait(15000);
    const result = await page().evaluate(() => {
      const upscaler = new window['Upscaler']();
      return upscaler.execute(window['fixtures']['default-model']);
    });
    checkImage(result, path.resolve(DEFAULT_MODEL_DIR, "result.png"), 'diff.png');
  });

  it("can import a specific model", async () => {
    const result = await page().evaluate(() => {
      const upscaler = new window['Upscaler']({
        model: window['pixel-upsampler']['4x'],
      });
      return upscaler.execute(window['fixtures']['pixel-upsampler']);
    });
    checkImage(result, path.resolve(PIXEL_UPSAMPLER_DIR, "4x/result.png"), 'diff.png');
  });

  it("loads a locally exposed model via implied HTTP", async () => {
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

  it("loads a locally exposed model via absolute HTTP", async () => {
    const result = await page().evaluate(() => {
      const upscaler = new window['Upscaler']({
        model: {
          path: `${window.location.origin}/models/pixel-upsampler/models/4x/4x.json`,
          scale: 4,
          modelType: 'layers',
        },
      });
      return upscaler.execute(window['fixtures']['pixel-upsampler']);
    });
    checkImage(result, path.resolve(PIXEL_UPSAMPLER_DIR, "4x/result.png"), 'diff.png');
  });

  it('clips a model that returns out of bound numbers when returning a base64 string src', async () => {
    const startingPixels = [-100,-100,-100,0,0,0,255,255,255,1000,1000,1000];
    const predictedPixels: number[] = await page().evaluate((startingPixels) => {
      const upscaler = new window['Upscaler']({
        model: window['pixel-upsampler']['2x'],
      });
      const tensor = tf.tensor(startingPixels).reshape([2,2,3]) as Tensor3D;
      const loadImage = (src: string): Promise<HTMLImageElement> => new Promise(resolve => {
        const img = new Image();
        img.src = src;
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
      });
      return upscaler.execute(tensor).then((output) => {
        return loadImage(output);
      }).then((img: HTMLImageElement) => {
        const predictedPixels = tf.browser.fromPixels(img);
        return Array.from(predictedPixels.dataSync());
      });
    }, startingPixels);
    expect(predictedPixels.length).toEqual(4*4*3);
    const predictedTensor = tfn.tensor(predictedPixels).reshape([4,4,3]);
    const expectedTensor = tfn.image.resizeNearestNeighbor(tfn.tensor(startingPixels).reshape([2,2,3]).clipByValue(0, 255) as Tensor3D, [4,4]);
    expect(expectedTensor.dataSync()).toEqual(predictedTensor.dataSync())
  });
});

declare global {
  interface Window {
    Upscaler: typeof Upscaler;
    tf: typeof tf;
    fixtures: Record<string, string>;
    'pixel-upsampler': Record<string, ModelDefinition>;
    'esrgan-legacy': Record<string, ModelDefinition>;
    PixelUpsampler2x: ModelDefinition;
  }
}
