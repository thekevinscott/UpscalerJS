/****
 * Tests that different approaches to loading a model all load correctly
 */
import fs from 'fs';
import path from 'path';
import * as http from 'http';
import { checkImage } from '../../lib/utils/checkImage';
import { bundle, DIST } from '../../lib/esm-esbuild/prepare';
import { startServer } from '../../lib/shared/server';
import puppeteer from 'puppeteer';
import Upscaler, { ModelDefinition } from 'upscaler';
import * as tf from '@tensorflow/tfjs';

const TRACK_TIME = false;
const LOG = true;
const JEST_TIMEOUT = 60 * 1000;
jest.setTimeout(JEST_TIMEOUT); // 60 seconds timeout
jest.retryTimes(0);

const ROOT = path.resolve(__dirname, '../../../');
const MODELS = path.resolve(ROOT, 'models');
const getAllAvailableModels = (model: string) => {
  const modelDir = path.resolve(MODELS, model);
  const { exports } = JSON.parse(fs.readFileSync(path.resolve(modelDir, 'package.json'), 'utf-8'))
  return Object.keys(exports).filter(key => key !== '.').map(key => path.basename(key));
};

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
        console.log('[PAGE]', message.text());
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
  //   const result = await execute("defaultModel.js");
  //   const formattedResult = `data:image/png;base64,${result}`;
  //   checkImage(formattedResult, "upscaled-4x-pixelator.png", 'diff.png');
  // });

  it("can import a model", async () => {
    const result = await page.evaluate(() => {
      const upscaler = new window['Upscaler']({
        model: window['pixelUpsampler4x3'],
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

  [
    'pixel-upsampler',
    'esrgan-legacy',
  ].map(packageName => {
    describe(packageName, () => {
      const models = getAllAvailableModels(packageName);
      models.forEach(modelName => {
        // console.log(packageName, modelName);
        it(`upscales with ${packageName}/${modelName}`, async () => {
          const result = await page.evaluate(([packageName, modelName]) => {
            const modelDefinition: any = window[packageName][modelName];
            const upscaler = new window['Upscaler']({
              model: modelDefinition,
            });
            return upscaler.upscale(window['flower']);
          }, [packageName, modelName]);
          checkImage(result, `${packageName}/${modelName}/result.png`, 'diff.png');
        });
      })
    })
  });
});

declare global {
  interface Window {
    Upscaler: typeof Upscaler;
    flower: string;
    tf: typeof tf;
    pixelUpsampler4x3: ModelDefinition;
    'pixel-upsampler': Record<string, ModelDefinition>;
    'esrgan-legacy': Record<string, ModelDefinition>;
  }
}
