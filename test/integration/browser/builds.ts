/****
 * Tests that different build outputs all function correctly
 */
import { checkImage } from '../../lib/utils/checkImage';
import { DIST as UMD_DIST, mockCDN as umdMockCDN } from '../../lib/umd/prepare';
import { DIST as WEBPACK_DIST, mockCDN as webpackMockCDN } from '../../lib/esm-webpack/prepare';
import path from 'path';
import * as tf from '@tensorflow/tfjs';
import Upscaler, { ModelDefinition } from 'upscaler';
import { ClientsideTestRunner } from '@internals/test-runner/clientside';
import { MODELS_DIR } from '@internals/common/constants';

const PIXEL_UPSAMPLER_DIR = path.resolve(MODELS_DIR, 'pixel-upsampler/test/__fixtures__');
const TRACK_TIME = false;
const JEST_TIMEOUT_IN_SECONDS = 120;
jest.setTimeout(JEST_TIMEOUT_IN_SECONDS * 1000);
jest.retryTimes(0);

describe('Build Integration Tests', () => {
  const testRunner = new ClientsideTestRunner({
    trackTime: TRACK_TIME,
    mock: true,
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
          path: '/models/pixel-upsampler/models/4x/4x.json',
          scale: 4,
          modelType: 'layers',
        },
      });
      return upscaler.execute(window['fixtures']['pixel-upsampler']);
    });
    checkImage(result, path.resolve(PIXEL_UPSAMPLER_DIR, "4x/result.png"), 'diff.png');
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
    checkImage(result, path.resolve(PIXEL_UPSAMPLER_DIR, "4x/result.png"), 'diff.png');
  });

  it("upscales using an ESM build using Webpack", async () => {
    const { page } = await start(WEBPACK_DIST, webpackMockCDN, '| Loaded');
    const result = await page.evaluate(() => {
      const Upscaler = window['Upscaler'];
      const upscaler = new Upscaler({
        model: {
          path: '/models/pixel-upsampler/models/4x/4x.json',
          scale: 4,
          modelType: 'layers',
        },
      });
      return upscaler.execute(window['fixtures']['pixel-upsampler']);
    });
    checkImage(result, path.resolve(PIXEL_UPSAMPLER_DIR, "4x/result.png"), 'diff.png');
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
