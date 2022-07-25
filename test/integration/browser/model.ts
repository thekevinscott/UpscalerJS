/****
 * Tests that different approaches to loading a model all load correctly
 */
import { checkImage } from '../../lib/utils/checkImage';
import { bundle, DIST as ESBUILD_DIST, mockCDN as esbuildMockCDN } from '../../lib/esm-esbuild/prepare';
import { prepareScriptBundleForUMD, DIST as UMD_DIST, mockCDN as umdMockCDN } from '../../lib/umd/prepare';
import Upscaler, { ModelDefinition } from 'upscaler';
import * as tf from '@tensorflow/tfjs';
import * as tfn from '@tensorflow/tfjs-node';
import { getAllAvailableModelPackages, getAllAvailableModels } from '../../../scripts/package-scripts/utils/getAllAvailableModels';
import { BrowserTestRunner } from '../utils/BrowserTestRunner';

const TRACK_TIME = false;
const LOG = true;
const JEST_TIMEOUT = 60 * 1000;
jest.setTimeout(JEST_TIMEOUT); // 60 seconds timeout
jest.retryTimes(0);

describe('Model Loading Integration Tests', () => {
  const testRunner = new BrowserTestRunner({
    mockCDN: esbuildMockCDN,
    dist: ESBUILD_DIST,
    trackTime: TRACK_TIME,
    log: LOG,
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

  it("loads the default model", async () => {
    const result = await page().evaluate(() => {
      const upscaler = new window['Upscaler']();
      return upscaler.upscale(window['flower']);
    });
    checkImage(result, "upscaled-4x-gans.png", 'diff.png');
  });

  it("can import a specific model", async () => {
    const result = await page().evaluate(() => {
      const upscaler = new window['Upscaler']({
        model: window['pixel-upsampler']['4x'],
      });
      return upscaler.upscale(window['flower']);
    });
    checkImage(result, "upscaled-4x-pixelator.png", 'diff.png');
  });

  it("loads a locally exposed model via implied HTTP", async () => {
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

  it("loads a locally exposed model via absolute HTTP", async () => {
    const result = await page().evaluate(() => {
      const upscaler = new window['Upscaler']({
        model: {
          path: `${window.location.origin}/pixelator/pixelator.json`,
          scale: 4,
        },
      });
      return upscaler.upscale(window['flower']);
    });
    checkImage(result, "upscaled-4x-pixelator.png", 'diff.png');
  });

  it('clips a model that returns out of bound numbers when returning a base64 string src', async () => {
    const startingPixels = [-100,-100,-100,0,0,0,255,255,255,1000,1000,1000];
    const predictedPixels: number[] = await page().evaluate((startingPixels) => {
      const upscaler = new window['Upscaler']({
        model: window['pixel-upsampler']['2x'],
      });
      const tensor = tf.tensor(startingPixels).reshape([2,2,3]) as tf.Tensor3D;
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
    const expectedTensor = tfn.image.resizeNearestNeighbor(tf.tensor(startingPixels).reshape([2,2,3]).clipByValue(0, 255) as tf.Tensor3D, [4,4]);
    expect(expectedTensor.dataSync()).toEqual(predictedTensor.dataSync())
  });

  it('does not clip a model that returns out of bound numbers when returning a tensor', async () => {
    const startingPixels = [-100,-100,-100,0,0,0,255,255,255,1000,1000,1000];
    const predictedPixels: number[] = await page().evaluate((startingPixels) => {
      const upscaler = new window['Upscaler']({
        model: window['pixel-upsampler']['2x'],
      });
      const tensor = tf.tensor(startingPixels).reshape([2,2,3]) as tf.Tensor3D;
      return upscaler.upscale(tensor, {
        output: 'tensor',
      }).then((output: tf.Tensor) => {
        return Array.from(output.dataSync());
      });
    }, startingPixels);
    expect(predictedPixels.length).toEqual(4*4*3);
    const predictedTensor = tfn.tensor(predictedPixels).reshape([4,4,3]);
    const expectedTensor = tfn.image.resizeNearestNeighbor(tfn.tensor(startingPixels).reshape([2,2,3]) as tf.Tensor3D, [4,4]);
    expect(expectedTensor.dataSync()).toEqual(predictedTensor.dataSync())
  });

  describe('Test specific model implementations', () => {
    const UMD_PORT = 8096;
    const umdTestRunner = new BrowserTestRunner({
      mockCDN: umdMockCDN,
      dist: UMD_DIST,
      port: UMD_PORT,
    });

    beforeAll(async function modelBeforeAll() {
      await umdTestRunner.beforeAll(prepareScriptBundleForUMD);
    }, 20000);

    afterAll(async function modelAfterAll() {
      await new Promise(r => setTimeout(r, 20000));
      await umdTestRunner.afterAll();
    }, 30000);

    getAllAvailableModelPackages().filter(m => m === 'pixel-upsampler').map(packageName => {
      describe(packageName, () => {
        const models = getAllAvailableModels(packageName);
        models.filter(n => n.esm === '2x').forEach(({ esm, umd: umdName }) => {
          const esmName = esm || 'index';
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
            checkImage(result, `${packageName}/${esmName}/result.png`, 'diff.png');
          });

          it(`upscales with ${packageName}/${esmName} as umd`, async () => {
            await umdTestRunner.startBrowser();
            await umdTestRunner.navigateToServer(null);
            const result = await umdTestRunner.page.evaluate(([umdName]) => {
              const model: ModelDefinition = (<any>window)[umdName];
              const upscaler = new window['Upscaler']({
                model,
              });
              return upscaler.upscale(<HTMLImageElement>document.getElementById('flower'));
            }, [umdName]);
            checkImage(result, `${packageName}/${esmName}/result.png`, 'diff.png');
            await umdTestRunner.stopBrowser();
          });
        });
      })
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
