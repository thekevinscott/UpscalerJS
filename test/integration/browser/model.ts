/****
 * Tests that different approaches to loading a model all load correctly
 */
import { checkImage } from '../../lib/utils/checkImage';
import { ESBUILD_DIST as ESBUILD_DIST, mockCDN as esbuildMockCDN } from '../../lib/esm-esbuild/prepare';
import Upscaler, { ModelDefinition } from 'upscaler';
import * as tf from '@tensorflow/tfjs';
import type { Tensor3D, } from '@tensorflow/tfjs';
import * as tfn from '@tensorflow/tfjs-node';
import { BrowserTestRunner } from '../utils/BrowserTestRunner';
import path from 'path';
import { MODELS_DIR } from '../../../scripts/package-scripts/utils/constants';
import { AvailableModel, getFilteredModels } from '../../../scripts/package-scripts/utils/getAllAvailableModels';
import { getPackageJSON } from '../../../scripts/package-scripts/utils/packages';

const PIXEL_UPSAMPLER_DIR = path.resolve(MODELS_DIR, 'pixel-upsampler/test/__fixtures__');
const DEFAULT_MODEL_DIR = path.resolve(MODELS_DIR, 'default-model/test/__fixtures__');

const TRACK_TIME = false;
const LOG = true;
const VERBOSE = false;
const USE_PNPM = `${process.env.USE_PNPM}` === '1';
const JEST_TIMEOUT = 60 * 1000 * 5;
jest.setTimeout(JEST_TIMEOUT); // 5 minute timeout
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
    const result = await page().evaluate(() => {
      const upscaler = new window['Upscaler']();
      return upscaler.execute(window['fixtures']['default-model']);
    });
    checkImage(result, path.resolve(DEFAULT_MODEL_DIR, "index/result.png"), 'diff.png');
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

  describe('Test specific model implementations', () => {
    const SPECIFIC_PACKAGE: string | undefined = undefined;
    const SPECIFIC_MODEL: string | undefined = undefined;
    const filteredPackagesAndModels = getFilteredModels({
      specificPackage: SPECIFIC_PACKAGE,
      specificModel: SPECIFIC_MODEL,
      filter: (packageName, model) => {
        const packagePath = path.resolve(MODELS_DIR, packageName);
        const packageJSON = getPackageJSON(packagePath);
        const supportedPlatforms = packageJSON['@upscalerjs']?.models?.[model.export]?.supportedPlatforms;

        return supportedPlatforms === undefined || supportedPlatforms.includes('browser');
      },
    }).reduce<[string, AvailableModel[]][]>((arr, [packageName, models]) => {
      return arr;
      // return arr.concat(models.map(({ esm, ...model }) => {
      //   return [
      //     packageName, {
      //       ...model,
      //       esm: esm === '' ? 'index' : esm,
      //     }];
      // }));
    }, []);

    filteredPackagesAndModels.forEach(([packageName, filteredModels]) => {
      describe(packageName, () => {
        filteredModels.forEach(({ esm }) => {
          const modelName = esm || 'index';
          it(`upscales with ${packageName}/${modelName} as esm`, async () => {
            const fixture = packageName;
            const result = await page().evaluate(({ fixture, packageName, modelName }) => {
              const model = window[packageName][modelName];
              const upscaler = new window['Upscaler']({
                model,
              });
              return upscaler.execute(window['fixtures'][fixture]);
            }, { fixture, packageName, modelName });
            const FIXTURE_PATH = path.resolve(MODELS_DIR, packageName, 'test/__fixtures__', modelName, 'result.png');
            checkImage(result, FIXTURE_PATH, 'diff.png');
          });
        });
      });
    });
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
