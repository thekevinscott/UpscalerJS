/****
 * Tests that different build outputs all function correctly
 */
import { checkImage } from '../../lib/utils/checkImage';
import { prepareScriptBundleForUMD, DIST as UMD_DIST, mockCDN as umdMockCDN } from '../../lib/umd/prepare';
import { prepareScriptBundleForESM, bundleWebpack, DIST as WEBPACK_DIST, mockCDN as webpackMockCDN } from '../../lib/esm-webpack/prepare';
import * as tf from '@tensorflow/tfjs';
import Upscaler, { ModelDefinition } from 'upscaler';
import { BrowserTestRunner, MockCDN } from '../utils/BrowserTestRunner';

const JEST_TIMEOUT_IN_SECONDS = 120;
jest.setTimeout(JEST_TIMEOUT_IN_SECONDS * 1000);
jest.retryTimes(1);

describe('Build Integration Tests', () => {
  const testRunner = new BrowserTestRunner({
    showWarnings: true,
  });

  afterEach(async function afterEach() {
    await testRunner.afterEach(async () => {
      await testRunner.stopServer();
    });
  }, 5000);

  const start = async (bundle: () => Promise<void>, dist: string, mockCDN: MockCDN, pageTitle: string | null = null) => {
    await bundle();
    testRunner.mockCDN = mockCDN;
    await Promise.all([
      testRunner.startServer(dist),
      testRunner.startBrowser(),
    ]);
    await testRunner.navigateToServer(pageTitle);
    const end = async () => {
      await Promise.all([
        testRunner.stopServer(),
        testRunner.closeBrowser(),

      ]);
    };
    return { page: testRunner.page, end } ;
  }

  it("upscales using a UMD build via a script tag", async () => {
    const { page, end } = await start(prepareScriptBundleForUMD, UMD_DIST, umdMockCDN);
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
    end();
  });

  it("upscales using a UMD build with a specified model", async () => {
    const { page, end } = await start(prepareScriptBundleForUMD, UMD_DIST, umdMockCDN);
    const result = await page.evaluate(() => {
      const Upscaler = window['Upscaler'];
      const pixelUpsampler = window['PixelUpsampler4x'];
      const upscaler = new Upscaler({
        model: pixelUpsampler,
      });
      return upscaler.upscale(<HTMLImageElement>document.getElementById('flower'));
    });
    checkImage(result, "upscaled-4x-pixelator.png", 'diff.png');
    end();
  });

  it("upscales using an ESM build using Webpack", async () => {
    const { page, end } = await start(async () => {
      await prepareScriptBundleForESM();
      await bundleWebpack();
    }, WEBPACK_DIST, webpackMockCDN, '| Loaded');
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
    end();
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
