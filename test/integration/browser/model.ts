/****
 * Tests that different approaches to loading a model all load correctly
 */
import { checkImage } from '../../lib/utils/checkImage';
import { bundleEsbuild, DIST as ESBUILD_DIST, mockCDN as esbuildMockCDN } from '../../lib/esm-esbuild/prepare';
import { prepareScriptBundleForUMD, DIST as UMD_DIST, mockCDN as umdMockCDN } from '../../lib/umd/prepare';
import Upscaler, { ModelDefinition } from 'upscaler';
import * as tf from '@tensorflow/tfjs';
import type { Tensor3D, } from '@tensorflow/tfjs';
import * as tfn from '@tensorflow/tfjs-node';
import { getAllAvailableModelPackages, getAllAvailableModels } from '../../../scripts/package-scripts/utils/getAllAvailableModels';
import { BrowserTestRunner } from '../utils/BrowserTestRunner';
import path from 'path';
import { MODELS_DIR } from '../../../scripts/package-scripts/utils/constants';

const PIXEL_UPSAMPLER_DIR = path.resolve(MODELS_DIR, 'pixel-upsampler/test/__fixtures__');
const ESRGAN_LEGACY_DIR = path.resolve(MODELS_DIR, 'esrgan-legacy/test/__fixtures__');

const TRACK_TIME = false;
const LOG = true;
const VERBOSE = false;
const USE_PNPM = `${process.env.USE_PNPM}` === '1';
const JEST_TIMEOUT = 60 * 1000;
jest.setTimeout(JEST_TIMEOUT); // 60 seconds timeout
jest.retryTimes(0);

const MODELS_TO_TEST = getAllAvailableModelPackages().filter(packageName => packageName !== 'experiments').reduce((arr, packageName) => {
  return arr.concat(getAllAvailableModels(packageName).filter(({ esm }) => {
    if (['esrgan-slim', 'esrgan-medium'].includes(packageName) && esm === "8x") {
      return false;
    }
    return true;
  }).map(({ esm: esmName, umd: umdName }) => ({
    packageName,
    esmName: esmName || 'index',
    umdName
  })));
}, [] as { packageName: string; esmName: string; umdName: string }[]);

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
    await testRunner.beforeAll(bundleEsbuild);
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

  it("loads the default model", async () => {
    const result = await page().evaluate(() => {
      const upscaler = new window['Upscaler']();
      return upscaler.upscale(window['flower']);
    });
    checkImage(result, path.resolve(ESRGAN_LEGACY_DIR, "gans/result.png"), 'diff.png');
  });

  it("can import a specific model", async () => {
    const result = await page().evaluate(() => {
      const upscaler = new window['Upscaler']({
        model: window['pixel-upsampler']['4x'],
      });
      return upscaler.upscale(window['flower']);
    });
    checkImage(result, path.resolve(PIXEL_UPSAMPLER_DIR, "4x/result.png"), 'diff.png');
  });

  it("loads a locally exposed model via implied HTTP", async () => {
    const result = await page().evaluate(() => {
      const upscaler = new window['Upscaler']({
        model: {
          path: '/models/pixel-upsampler/models/4x/4x.json',
          scale: 4,
        },
      });
      return upscaler.upscale(window['flower']);
    });
    checkImage(result, path.resolve(PIXEL_UPSAMPLER_DIR, "4x/result.png"), 'diff.png');
  });

  it("loads a locally exposed model via absolute HTTP", async () => {
    const result = await page().evaluate(() => {
      const upscaler = new window['Upscaler']({
        model: {
          path: `${window.location.origin}/models/pixel-upsampler/models/4x/4x.json`,
          scale: 4,
        },
      });
      return upscaler.upscale(window['flower']);
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
      return upscaler.upscale(tensor).then((output: string) => {
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

  it('does not clip a model that returns out of bound numbers when returning a tensor', async () => {
    const startingPixels = [-100,-100,-100,0,0,0,255,255,255,1000,1000,1000];
    const predictedPixels: number[] = await page().evaluate((startingPixels) => {
      const upscaler: Upscaler = new window['Upscaler']({
        model: window['pixel-upsampler']['2x'],
      });
      const tensor = tf.tensor(startingPixels).reshape([2,2,3]) as Tensor3D;
      return upscaler.upscale<any, 'tensor'>(tensor, {
        output: 'tensor',
      }).then((output) => {
        return Array.from(output.dataSync());
      });
    }, startingPixels);
    expect(predictedPixels.length).toEqual(4*4*3);
    const predictedTensor = tfn.tensor(predictedPixels).reshape([4,4,3]);
    const expectedTensor = tfn.image.resizeNearestNeighbor(tfn.tensor(startingPixels).reshape([2,2,3]) as Tensor3D, [4,4]);
    expect(expectedTensor.dataSync()).toEqual(predictedTensor.dataSync())
  });

  describe('Test specific model implementations', () => {
    describe('esm', () => {
      MODELS_TO_TEST.map(({ packageName, esmName }) => {
        it(`upscales with ${packageName}/${esmName} as esm`, async () => {
          await testRunner.navigateToServer('| Loaded');
          const result = await page().evaluate(([packageName, modelName]) => {
            if (!modelName) {
              throw new Error(`No model name found for package ${packageName}`);
            }
            // TODO: window fails to be typed correctly in CI
            // https://github.com/thekevinscott/UpscalerJS/runs/7176553596?check_suite_focus=true#step:7:60
            // Locally it works fine
            const modelDefinition = (window as any)[packageName][modelName];
            if (!modelDefinition) {
              throw new Error(`No model definition found for package name ${packageName} and model name ${modelName}`);
            }
            const upscaler = new window['Upscaler']({
              model: modelDefinition,
            });
            return upscaler.upscale(window['flower']);
          }, [packageName, esmName]);
          checkImage(result, path.resolve(MODELS_DIR, packageName, 'test/__fixtures__', esmName, "result.png"), 'diff.png');
        });
      });
    });

    describe('umd', () => {
      const UMD_PORT = 8096;
      const umdTestRunner = new BrowserTestRunner({
        name: 'umd',
        mockCDN: umdMockCDN,
        dist: UMD_DIST,
        port: UMD_PORT,
      });

      beforeAll(async function modelBeforeAll() {
        await umdTestRunner.beforeAll(prepareScriptBundleForUMD);
      }, 20000);

      afterAll(async function modelAfterAll() {
        await umdTestRunner.afterAll();
      }, 30000);

      beforeEach(async function beforeEach() {
        await umdTestRunner.beforeEach(null);
      });

      afterEach(async function afterEach() {
        await umdTestRunner.afterEach();
      });

      MODELS_TO_TEST.map(({ packageName, esmName, umdName }) => {
        it(`upscales with ${packageName}/${esmName} as umd`, async () => {
          const result = await umdTestRunner.page.evaluate(([umdName]) => {
            const model: ModelDefinition = (<any>window)[umdName];
            const upscaler = new window['Upscaler']({
              model,
            });
            return upscaler.upscale(<HTMLImageElement>document.getElementById('flower'));
          }, [umdName]);
          checkImage(result, path.resolve(MODELS_DIR, packageName, 'test/__fixtures__', esmName, "result.png"), 'diff.png');
        });
      });
    });
  });

});

declare global {
  interface Window {
    Upscaler: typeof Upscaler;
    flower: string;
    tf: typeof tf;
    'pixel-upsampler': Record<string, ModelDefinition>;
    'esrgan-legacy': Record<string, ModelDefinition>;
    PixelUpsampler2x: ModelDefinition;
  }
}
