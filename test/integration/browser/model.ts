/****
 * Tests that different approaches to loading a model all load correctly
 */
import http from 'http';
import { checkImage } from '../../lib/utils/checkImage';
import { bundle, DIST } from '../../lib/esm-esbuild/prepare';
import { prepareScriptBundleForUMD, DIST as UMD_DIST } from '../../lib/umd/prepare';
import { startServer } from '../../lib/shared/server';
import Upscaler, { ModelDefinition } from 'upscaler';
import * as tf from '@tensorflow/tfjs';
import { getAllAvailableModelPackages, getAllAvailableModels } from '../../../scripts/package-scripts/utils/getAllAvailableModels';
import { TestRunner } from './utils/TestRunner';

const TRACK_TIME = false;
const LOG = true;
const JEST_TIMEOUT = 60 * 1000;
jest.setTimeout(JEST_TIMEOUT); // 60 seconds timeout
jest.retryTimes(0);

describe('Model Loading Integration Tests', () => {
  const testRunner = new TestRunner({ dist: DIST, trackTime: TRACK_TIME, log: LOG });
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

  describe('Test specific model implementations', () => {
    let serverUMD: http.Server;

    const PORT_UMD = 8098;

    beforeAll(async function beforeAll() {
      await prepareScriptBundleForUMD();
      serverUMD = await startServer(PORT_UMD, UMD_DIST);
    }, 20000);

    afterAll(async function modelAfterAll() {
      const stopServer = (): Promise<void | Error> => new Promise((resolve) => {
        if (serverUMD) {
          serverUMD.close(resolve);
        } else {
          console.warn('No server found')
          resolve();
        }
      });

      await stopServer();
    }, 10000);

    getAllAvailableModelPackages().map(packageName => {
      describe(packageName, () => {
        const models = getAllAvailableModels(packageName);
        models.forEach(({ esm, umd: umdName }) => {
          const esmName = esm || 'index';
          it(`upscales with ${packageName}/${esmName} as esm`, async () => {
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
            await page().goto(`http://localhost:${PORT_UMD}`);
            const result = await page().evaluate(([umdName]) => {
              const model: ModelDefinition = (<any>window)[umdName];
              const upscaler = new window['Upscaler']({
                model,
              });
              return upscaler.upscale(<HTMLImageElement>document.getElementById('flower'));
            }, [umdName]);
            checkImage(result, `${packageName}/${esmName}/result.png`, 'diff.png');
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
