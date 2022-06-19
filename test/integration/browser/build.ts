/****
 * Tests that different build outputs all function correctly
 */
import * as http from 'http';
import { checkImage } from '../../lib/utils/checkImage';
import { prepareScriptBundleForUMD, DIST as SCRIPT_DIST } from '../../lib/umd/prepare';
import { startServer } from '../../lib/shared/server';
import { prepareScriptBundleForESM, bundleWebpack, DIST as WEBPACK_DIST } from '../../lib/esm-webpack/prepare';
import puppeteer from 'puppeteer';
import * as tf from '@tensorflow/tfjs';
import Upscaler, { ModelDefinition } from 'upscaler';

const JEST_TIMEOUT_IN_SECONDS = 120;
jest.setTimeout(JEST_TIMEOUT_IN_SECONDS * 1000);
jest.retryTimes(1);

describe('Build Integration Tests', () => {
  let server: http.Server;
  let browser: puppeteer.Browser;
  let page: puppeteer.Page;

  const PORT = 8099;

  afterEach(async function afterEach() {
    const stopServer = (): Promise<void | Error> => new Promise((resolve) => {
      if (server) {
        server.close(resolve);
      } else {
        resolve();
      }
    });
    await Promise.all([
      stopServer(),
      browser ? browser.close() : undefined,
    ]);
    browser = undefined;
    page = undefined;
  });

  const startBrowser = async () => {
    browser = await puppeteer.launch();
    page = await browser.newPage();
    await page.goto(`http://localhost:${PORT}`);
  }

  it("upscales using a UMD build via a script tag", async () => {
    await prepareScriptBundleForUMD();
    server = await startServer(PORT, SCRIPT_DIST);
    await startBrowser();
    const result = await page.evaluate(() => {
      const Upscaler = window['Upscaler'];
      const upscaler = new Upscaler({
        model: {
          path: '/pixelator/pixelator.json',
          scale: 4,
        },
      });
      return upscaler.upscale(<HTMLImageElement>document.getElementById('flower'));
    });
    checkImage(result, "upscaled-4x-pixelator.png", 'diff.png');
  });

  it("upscales using a UMD build with a specified model", async () => {
    await prepareScriptBundleForUMD();
    server = await startServer(PORT, SCRIPT_DIST);
    await startBrowser();
    const result = await page.evaluate(() => {
      const Upscaler = window['Upscaler'];
      const pixelUpsampler = window['PixelUpsampler4x'];
      const upscaler = new Upscaler({
        model: pixelUpsampler,
      });
      return upscaler.upscale(<HTMLImageElement>document.getElementById('flower'));
    });
    checkImage(result, "upscaled-4x-pixelator.png", 'diff.png');
  });

  it("upscales using an ESM build using Webpack", async () => {
    await prepareScriptBundleForESM();
    await bundleWebpack();
    server = await startServer(PORT, WEBPACK_DIST);
    await startBrowser();
    await page.waitForFunction('document.title.endsWith("| Loaded")');
    const result = await page.evaluate(() => {
      const Upscaler = window['Upscaler'];
      const upscaler = new Upscaler({
        model: {
          path: '/pixelator/pixelator.json',
          scale: 4,
        },
      });
      return upscaler.upscale(window['flower']);
    });
    checkImage(result, "upscaled-4x-pixelator.png", 'diff.png');
  });
});

declare global {
  interface Window {
    Upscaler: typeof Upscaler;
    flower: string;
    tf: typeof tf;
    PixelUpsampler4x: ModelDefinition; 
  }
}
