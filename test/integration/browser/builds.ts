/****
 * Tests that different build outputs all function correctly
 */
import { checkImage } from '../../lib/utils/checkImage';
import { prepareScriptBundleForUMD, DIST as UMD_DIST, mockCDN as umdMockCDN } from '../../lib/umd/prepare';
import { prepareScriptBundleForESM, bundleWebpack, DIST as WEBPACK_DIST, mockCDN as webpackMockCDN } from '../../lib/esm-webpack/prepare';
import path from 'path';
import * as tf from '@tensorflow/tfjs';
import Upscaler, { ModelDefinition } from 'upscaler';
import { BrowserTestRunner, MockCDN } from '../utils/BrowserTestRunner';
import { MODELS_DIR } from '../../../scripts/package-scripts/utils/constants';

const PIXEL_UPSAMPLER_DIR = path.resolve(MODELS_DIR, 'pixel-upsampler/test/__fixtures__');
const JEST_TIMEOUT_IN_SECONDS = 120;
const VERBOSE = true;
const USE_PNPM = `${process.env.USE_PNPM}` === '1';
jest.setTimeout(JEST_TIMEOUT_IN_SECONDS * 1000);
jest.retryTimes(0);

describe('Build Integration Tests', () => {
  const testRunner = new BrowserTestRunner({
    showWarnings: true,
    verbose: VERBOSE,
    usePNPM: USE_PNPM,
  });

  beforeAll(async () => {
    await testRunner.startBrowser();
  });

  beforeEach(async () => {
    await testRunner.createNewPage();
  });

  afterAll(async () => {
    await testRunner.closeBrowser();
  });

  afterEach(async function afterEach() {
    await testRunner.afterEach(async () => {
      await testRunner.stopServer();
    });
  }, 5000);

  const start = async (bundle: () => Promise<void>, dist: string, mockCDN: MockCDN, pageTitle: string | null = null) => {
    await bundle();
    testRunner.mockCDN = mockCDN;
    await testRunner.startServer(dist);
    await testRunner.navigateToServer(pageTitle);
    return { page: testRunner.page } ;
  }

  it("upscales using a UMD build via a script tag", async () => {
    const { page } = await start(prepareScriptBundleForUMD, UMD_DIST, umdMockCDN);
    const result = await page.evaluate(() => {
      const Upscaler = window['Upscaler'];
      const upscaler = new Upscaler({
        model: {
          path: '/models/pixel-upsampler/models/4x/4x.json',
          scale: 4,
        },
      });
      return upscaler.upscale(<HTMLImageElement>document.getElementById('flower'));
    });
    checkImage(result, path.resolve(PIXEL_UPSAMPLER_DIR, "4x/result.png"), 'diff.png');
  });

  it("upscales using a UMD build with a specified model", async () => {
    const { page } = await start(prepareScriptBundleForUMD, UMD_DIST, umdMockCDN);
    const result = await page.evaluate(() => {
      const Upscaler = window['Upscaler'];
      const pixelUpsampler = window['PixelUpsampler4x'];
      const upscaler = new Upscaler({
        model: pixelUpsampler,
      });
      return upscaler.upscale(<HTMLImageElement>document.getElementById('flower'));
    });
    checkImage(result, path.resolve(PIXEL_UPSAMPLER_DIR, "4x/result.png"), 'diff.png');
  });

  it("upscales using an ESM build using Webpack", async () => {
    const { page } = await start(async () => {
      await prepareScriptBundleForESM({ verbose: VERBOSE });
      await bundleWebpack({ verbose: VERBOSE });
    }, WEBPACK_DIST, webpackMockCDN, '| Loaded');
    await new Promise(r => setTimeout(r, 60000));
    const result = await page.evaluate(() => {
      const Upscaler = window['Upscaler'];
      const upscaler = new Upscaler({
        model: {
          path: '/models/pixel-upsampler/models/4x/4x.json',
          scale: 4,
        },
      });
      return upscaler.upscale(window['flower']);
    });
    checkImage(result, path.resolve(PIXEL_UPSAMPLER_DIR, "4x/result.png"), 'diff.png');
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
