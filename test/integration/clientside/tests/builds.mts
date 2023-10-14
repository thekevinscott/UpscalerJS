/****
 * Tests that different build outputs all function correctly
 */
import { checkImage } from '../../../lib/utils/checkImage.js';
import path from 'path';
import * as tf from '@tensorflow/tfjs';
import Upscaler, { ModelDefinition } from 'upscaler';
import { BrowserTestRunner, MockCDN } from '../../utils/BrowserTestRunner.js';
import { MODELS_DIR } from '../../../../scripts/package-scripts/utils/constants.js';

const PIXEL_UPSAMPLER_DIR = path.resolve(MODELS_DIR, 'pixel-upsampler/test/__fixtures__');

const ROOT_BUNDLER_OUTPUT_DIR = process.env.ROOT_BUNDLER_OUTPUT_DIR;
if (typeof ROOT_BUNDLER_OUTPUT_DIR !== 'string') {
  throw new Error('ROOT_BUNDLER_OUTPUT_DIR not defined in env');
}
const UMD_DIST = path.resolve(ROOT_BUNDLER_OUTPUT_DIR, 'umd/dist')
const WEBPACK_DIST = path.resolve(ROOT_BUNDLER_OUTPUT_DIR, 'webpack/dist')

describe('Build Integration Tests', () => {
  const testRunner = new BrowserTestRunner({
    showWarnings: true,
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

  const start = async (dist: string, mockCDN: MockCDN, pageTitle: string | null = null) => {
    testRunner.mockCDN = mockCDN;
    await testRunner.startServer(dist);
    await testRunner.navigateToServer(pageTitle);
    return { page: testRunner.page } ;
  }

  it("upscales using a UMD build via a script tag", async () => {
    const { page } = await start(UMD_DIST, umdMockCDN);
    const result = await page.evaluate(() => {
      const Upscaler = window['Upscaler'];
      const upscaler = new Upscaler({
        model: {
          path: '/models/pixel-upsampler/models/x4/x4.json',
          scale: 4,
          modelType: 'layers',
        },
      });
      return upscaler.execute(window['fixtures']['pixel-upsampler']);
    });
    checkImage(result, path.resolve(PIXEL_UPSAMPLER_DIR, "x4/result.png"), 'diff.png');
  });

  it("upscales using a UMD build with a specified model", async () => {
    const { page } = await start(UMD_DIST, umdMockCDN);
    const result = await page.evaluate(() => {
      const Upscaler = window['Upscaler'];
      const pixelUpsampler = window['PixelUpsampler4x'];
      const upscaler = new Upscaler({
        model: pixelUpsampler,
      });
      return upscaler.execute(window['fixtures']['pixel-upsampler']);
    });
    checkImage(result, path.resolve(PIXEL_UPSAMPLER_DIR, "x4/result.png"), 'diff.png');
  });

  it("upscales using an ESM build using Webpack", async () => {
    const { page } = await start(WEBPACK_DIST, webpackMockCDN, '| Loaded');
    const result = await page.evaluate(() => {
      const Upscaler = window['Upscaler'];
      const upscaler = new Upscaler({
        model: {
          path: '/models/pixel-upsampler/models/x4/x4.json',
          scale: 4,
          modelType: 'layers',
        },
      });
      return upscaler.execute(window['fixtures']['pixel-upsampler']);
    });
    checkImage(result, path.resolve(PIXEL_UPSAMPLER_DIR, "x4/result.png"), 'diff.png');
  });
});

declare global {
  interface Window {
    Upscaler: typeof Upscaler;
    fixtures: Record<string, string>;
    tf: typeof tf;
    PixelUpsampler4x: ModelDefinition; 
  }
}
