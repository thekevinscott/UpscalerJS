/****
 * Tests that different build outputs all function correctly
 */
import path from 'path';
import * as tf from '@tensorflow/tfjs';
import Upscaler, { ModelDefinition } from 'upscaler';
import { MODELS_DIR } from '@internals/common/constants';
import { ClientsideTestRunner } from '@internals/test-runner/clientside';

const PIXEL_UPSAMPLER_DIR = path.resolve(MODELS_DIR, 'pixel-upsampler/test/__fixtures__');

const ROOT_BUNDLER_OUTPUT_DIR = process.env.ROOT_BUNDLER_OUTPUT_DIR;
if (typeof ROOT_BUNDLER_OUTPUT_DIR !== 'string') {
  throw new Error('ROOT_BUNDLER_OUTPUT_DIR not defined in env');
}
const UMD_DIST_FOLDER = path.resolve(ROOT_BUNDLER_OUTPUT_DIR, 'umd/dist')
const WEBPACK_DIST_FOLDER = path.resolve(ROOT_BUNDLER_OUTPUT_DIR, 'webpack/dist')

describe('Build Integration Tests', () => {
  describe('umd', () => {
    const testRunner = new ClientsideTestRunner({
      mock: true,
      dist: UMD_DIST_FOLDER,
    })

    beforeAll(async () => {
      await testRunner.beforeAll();
    });

    beforeEach(async () => {
      await testRunner.beforeEach();
    });

    afterAll(async () => {
      await testRunner.afterAll();
    });

    afterEach(async function afterEach() {
      await testRunner.afterEach();
    }, 5000);

    it("upscales using a UMD build with a specified model", async () => {
      const page = testRunner.page;
      const fixturePath = `${await testRunner.getFixturesServerURL()}/pixel-upsampler/test/__fixtures__/fixture.png`;
      const modelScriptPath = `${await testRunner.getFixturesServerURL()}/pixel-upsampler/dist/umd/x4.min.js`;
      const result = await page.evaluate(async ({ modelScriptPath, fixturePath }) => {
        const Upscaler = window['Upscaler'];
        await window['loadScript'](modelScriptPath);
        const pixelUpsampler = window['PixelUpsampler4x'];
        const upscaler = new Upscaler({
          model: pixelUpsampler,
        });
        return upscaler.execute(fixturePath);
      }, { modelScriptPath, fixturePath });
      expect(result).toMatchImage(path.resolve(PIXEL_UPSAMPLER_DIR, "x4/result.png"));
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
      expect(result).toMatchImage(path.resolve(PIXEL_UPSAMPLER_DIR, "x4/result.png"));
    });
  });

  describe('webpack', () => {
    const testRunner = new ClientsideTestRunner({
      mock: true,
      dist: WEBPACK_DIST_FOLDER,
    })

    beforeAll(async () => {
      await testRunner.beforeAll();
    });

    beforeEach(async () => {
      await testRunner.beforeEach();
    });

    afterAll(async () => {
      await testRunner.afterAll();
    });

    afterEach(async function afterEach() {
      await testRunner.afterEach();
    }, 5000);

    it("upscales using an ESM build using Webpack", async () => {
      const page = testRunner.page;
      const fixturePath = `${await testRunner.getFixturesServerURL()}/pixel-upsampler/test/__fixtures__/fixture.png`;
      const modelPath = `${await testRunner.getFixturesServerURL()}/pixel-upsampler/models/x4/x4.json`;
      const result = await page.evaluate(({ modelPath, fixturePath }) => {
        const Upscaler = window['Upscaler'];
        const upscaler = new Upscaler({
          model: {
            path: modelPath,
            scale: 4,
            modelType: 'layers',
          },
        });
        return upscaler.execute(fixturePath);
      }, { modelPath, fixturePath });
      expect(result).toMatchImage(path.resolve(PIXEL_UPSAMPLER_DIR, "x4/result.png"));
    });
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
