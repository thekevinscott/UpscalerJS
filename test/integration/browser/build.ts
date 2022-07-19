/****
 * Tests that different build outputs all function correctly
 */
import { checkImage } from '../../lib/utils/checkImage';
import { prepareScriptBundleForUMD, DIST as SCRIPT_DIST } from '../../lib/umd/prepare';
import { prepareScriptBundleForESM, bundleWebpack, DIST as WEBPACK_DIST } from '../../lib/esm-webpack/prepare';
import * as tf from '@tensorflow/tfjs';
import Upscaler, { ModelDefinition } from 'upscaler';
import { TestRunner } from './utils/TestRunner';

const JEST_TIMEOUT_IN_SECONDS = 120;
jest.setTimeout(JEST_TIMEOUT_IN_SECONDS * 1000);
jest.retryTimes(1);

describe('Build Integration Tests', () => {
  const testRunner = new TestRunner();
  const page = testRunner.page;

  afterEach(async function afterEach() {
    testRunner.afterEach(() => testRunner.stopServer());
  });

  it("upscales using a UMD build via a script tag", async () => {
    await prepareScriptBundleForUMD();
    await testRunner.startServer(SCRIPT_DIST);
    testRunner.startBrowser();
    const result = await page().evaluate(() => {
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
    await testRunner.startServer(SCRIPT_DIST);
    testRunner.startBrowser();
    const result = await page().evaluate(() => {
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
    await testRunner.startServer(WEBPACK_DIST);
    testRunner.startBrowser('| Loaded');
    const result = await page().evaluate(() => {
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
