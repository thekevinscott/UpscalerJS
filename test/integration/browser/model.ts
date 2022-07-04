/****
 * Tests that different approaches to loading a model all load correctly
 */
import * as http from 'http';
import { checkImage } from '../../lib/utils/checkImage';
import { bundle, DIST } from '../../lib/esm-esbuild/prepare';
import { prepareScriptBundleForUMD, DIST as UMD_DIST } from '../../lib/umd/prepare';
import { startServer } from '../../lib/shared/server';
import puppeteer from 'puppeteer';
import Upscaler, { ModelDefinition } from 'upscaler';
import * as tf from '@tensorflow/tfjs';
import { getAllAvailableModelPackages, getAllAvailableModels } from '../../lib/utils/getAllAvailableModels';

const TRACK_TIME = false;
const LOG = true;
const JEST_TIMEOUT = 60 * 1000;
jest.setTimeout(JEST_TIMEOUT); // 60 seconds timeout
jest.retryTimes(0);

describe('Model Loading Integration Tests', () => {
  let server: http.Server;
  let browser: puppeteer.Browser;
  let page: puppeteer.Page;

  const PORT = 8099;

  beforeAll(async function beforeAll() {
    const start = new Date().getTime();

    await bundle();
    server = await startServer(PORT, DIST);

    const end = new Date().getTime();
    if (TRACK_TIME) {
      console.log(`Completed pre-test scaffolding in ${Math.round((end - start) / 1000)} seconds`);
    }
  }, 20000);

  afterAll(async function modelAfterAll() {
    const start = new Date().getTime();
    const stopServer = (): Promise<void | Error> => new Promise((resolve) => {
      if (server) {
        server.close(resolve);
      } else {
        console.warn('No server found')
        resolve();
      }
    });

    await Promise.all([
      stopServer(),
    ]);
    const end = new Date().getTime();
    if (TRACK_TIME) {
      console.log(`Completed post-test clean up in ${Math.round((end - start) / 1000)} seconds`);
    }
  }, 10000);

  beforeEach(async function beforeEach() {
    browser = await puppeteer.launch();
    page = await browser.newPage();
    if (LOG) {
      page.on('console', message => {
        const text = message.text().trim();
        console.log('[PAGE]', text);
        if (text.startsWith('Failed to load resource: the server responded with a status of 404')) {
          console.log(message);
        }
      });
    }
    await page.goto(`http://localhost:${PORT}`);
    await page.waitForFunction('document.title.endsWith("| Loaded")');
  });

  afterEach(async function afterEach() {
    await browser.close();
    browser = undefined;
    page = undefined;
  });

  // it("loads the default model", async () => {
  //   const result = await page.evaluate(() => {
  //     const upscaler = new window['Upscaler']();
  //     return upscaler.upscale(window['flower']);
  //   });
  //   checkImage(result, "upscaled-4x-gans.png", 'diff.png');
  // });

  it("can import a specific model", async () => {
    const result = await page.evaluate(() => {
      const upscaler = new window['Upscaler']({
        model: window['pixel-upsampler']['4x'],
      });
      return upscaler.upscale(window['flower']);
    });
    checkImage(result, "upscaled-4x-pixelator.png", 'diff.png');
  });

  it("loads a locally exposed model via implied HTTP", async () => {
    const result = await page.evaluate(() => {
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
    const result = await page.evaluate(() => {
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
        models.forEach(({ esm: esmName, umd: umdName }) => {
          it(`upscales with ${packageName}/${esmName} as esm`, async () => {
            const result = await page.evaluate(([packageName, modelName]) => {
              const isModelDefinition = (modelDefinition: unknown): modelDefinition is ModelDefinition => {
                return !!modelDefinition && typeof modelDefinition === 'object' && 'path' in modelDefinition;
              }
              // TODO: window fails to be typed correctly in CI
              // https://github.com/thekevinscott/UpscalerJS/runs/7176553596?check_suite_focus=true#step:7:60
              // Locally it works fine
              const modelDefinition = (window as any)[packageName][modelName];
              if (isModelDefinition(modelDefinition)) {
                const upscaler = new window['Upscaler']({
                  model: modelDefinition,
                });
                return upscaler.upscale(window['flower']);
              } else {
                throw new Error(`Invalid model Definition for package name ${packageName} and model name ${modelName}`)
              }
            }, [packageName, esmName]);
            checkImage(result, `${packageName}/${esmName}/result.png`, 'diff.png');
          });

          it(`upscales with ${packageName}/${esmName} as umd`, async () => {
            await page.goto(`http://localhost:${PORT_UMD}`);
            const result = await page.evaluate(([umdName]) => {
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
