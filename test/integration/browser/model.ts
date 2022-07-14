/****
 * Tests that different approaches to loading a model all load correctly
 */
import http from 'http';
import { checkImage } from '../../lib/utils/checkImage';
import { bundle, DIST } from '../../lib/esm-esbuild/prepare';
import { prepareScriptBundleForUMD, DIST as UMD_DIST } from '../../lib/umd/prepare';
import { startServer } from '../../lib/shared/server';
import puppeteer from 'puppeteer';
import Upscaler, { ModelDefinition } from 'upscaler';
import * as tf from '@tensorflow/tfjs';
import { getAllAvailableModelPackages, getAllAvailableModels } from '../../../scripts/package-scripts/utils/getAllAvailableModels';

const TRACK_TIME = false;
const LOG = true;
const JEST_TIMEOUT = 60 * 1000;
jest.setTimeout(JEST_TIMEOUT); // 60 seconds timeout
jest.retryTimes(0);

const MESSAGES_TO_IGNORE = [
  'Initialization of backend webgl failed',
  'Could not get context for WebGL version 1',
  'Could not get context for WebGL version 2',
  'Error: WebGL is not supported on this device',
  'WebGL is not supported on this device',
];

const isIgnoredMessage = (msg: string) => {
  for (let i = 0; i < MESSAGES_TO_IGNORE.length; i++) {
    const messageToIgnore = MESSAGES_TO_IGNORE[i];
    if (msg.includes(messageToIgnore)) {
      return true;
    }
  }

  return false;
};

describe('Model Loading Integration Tests', () => {
  let server: http.Server;
  let _browser: puppeteer.Browser | undefined;
  let _page: puppeteer.Page | undefined;
  let browser = (): puppeteer.Browser => {
    if (!_browser) {
      throw new Error('Browser is undefined');
    }
    return _browser;
  };
  let page = (): puppeteer.Page => {
    if (!_page) {
      throw new Error('Page is undefined');
    }
    return _page;
  };

  const PORT = 8099;

  beforeAll(async function beforeAll() {
    const start = new Date().getTime();

    await bundle();
    server = await startServer(PORT, DIST);

    const end = new Date().getTime();
    if (TRACK_TIME) {
      console.log(`Completed pre-test scaffolding in ${Math.round((end - start) / 1000)} seconds`);
    }
  }, 60000);

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
    _browser = await puppeteer.launch();
    _page = await _browser.newPage();
    if (LOG) {
      _page.on('console', message => {
        const text = message.text().trim();
        if (text.startsWith('Failed to load resource: the server responded with a status of 404')) {
          console.log('404', text, message);
        } else if (!isIgnoredMessage(text)) {
          console.log('[PAGE]', text);
        }
      });
    }
    await _page.goto(`http://localhost:${PORT}`);
    await _page.waitForFunction('document.title.endsWith("| Loaded")');
  });

  afterEach(async function afterEach() {
    await browser().close(),
    _browser = undefined;
    _page = undefined;
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
