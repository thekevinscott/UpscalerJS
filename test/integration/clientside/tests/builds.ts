/****
 * Tests that different build outputs all function correctly
 */
import path from 'path';
import * as tf from '@tensorflow/tfjs';
import Upscaler, { ModelDefinition } from 'upscaler';
import { ClientsideTestRunner } from '@internals/test-runner/clientside';
import { MODELS_DIR } from '@internals/common/constants';

const TRACK_TIME = true;
const ROOT_BUNDLER_OUTPUT_DIR = process.env.ROOT_BUNDLER_OUTPUT_DIR;
if (typeof ROOT_BUNDLER_OUTPUT_DIR !== 'string') {
  throw new Error('ROOT_BUNDLER_OUTPUT_DIR not defined in env');
}
const UMD_DIST = path.resolve(ROOT_BUNDLER_OUTPUT_DIR, 'umd/dist');
const WEBPACK_DIST = path.resolve(ROOT_BUNDLER_OUTPUT_DIR, 'webpack/dist');

const getFixturePath = (packageName: string, modelName?: string) => path.resolve(...[
  MODELS_DIR,
  packageName,
  'test/__fixtures__',
  modelName === undefined || modelName === 'index' ? '' : modelName,
  'result.png'
].filter(Boolean));

describe.only('Build Integration Tests', () => {
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
      await testRunner.stopServers();
    });
  }, 5000);

  const start = async (dist: string, { name, pageTitle = null, }: { pageTitle?: string | null, name: string }) => {
    try {
      await testRunner.startServers({ dist, name });
      await testRunner.navigateToServer(pageTitle);
      return { page: testRunner.page };
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  it("upscales using a UMD build via a script tag", async () => {
    const { page } = await start(UMD_DIST, { name: 'umd' });
    const fixtureServerURL = await testRunner.getFixturesServerURL();
    const fixturePath = `${fixtureServerURL}/default-model/test/__fixtures__/fixture.png`;
    const src = `${fixtureServerURL}/default-model/dist/umd/index.min.js`;
    const result = await page.evaluate(async ({ src, fixturePath }) => {
      await window['loadScript'](src);
      const Upscaler = window['Upscaler'];
      const upscaler = new Upscaler({
        model: window['DefaultUpscalerJSModel'],
      });

      return upscaler.execute(fixturePath);
    }, { fixturePath, src });
    expect(result).toMatchImage(getFixturePath('default-model'));
  });

  it("upscales using a UMD build with a specified model", async () => {
    const { page } = await start(UMD_DIST, { name: 'umd' });
    const fixtureServerURL = await testRunner.getFixturesServerURL();
    const fixturePath = `${fixtureServerURL}/pixel-upsampler/test/__fixtures__/fixture.png`;
    const src = `${fixtureServerURL}/pixel-upsampler/dist/umd/4x.min.js`;
    const result = await page.evaluate(async ({ fixturePath, src }) => {
      await window['loadScript'](src);
      const Upscaler = window['Upscaler'];
      const upscaler = new Upscaler({
        model: window['PixelUpsampler4x'],
      });
      return upscaler.execute(fixturePath);
    }, { src, fixturePath });
    expect(result).toMatchImage(getFixturePath('pixel-upsampler', '4x'));
  });

  it("upscales using an ESM build using Webpack", async () => {
    const { page } = await start(WEBPACK_DIST, { name: 'webpack', pageTitle: '| Loaded' });
    const fixtureServerURL = await testRunner.getFixturesServerURL();
    const fixturePath = `${fixtureServerURL}/pixel-upsampler/test/__fixtures__/fixture.png`;
    const result = await page.evaluate(({ fixturePath }) => {
      const Upscaler = window['Upscaler'];
      const upscaler = new Upscaler({
        model: window['@upscalerjs/pixel-upsampler/4x'],
      });
      return upscaler.execute(fixturePath);
    }, { fixturePath});
    expect(result).toMatchImage(getFixturePath('pixel-upsampler', '4x'));
  });
});

declare global {
  interface Window {
    Upscaler: typeof Upscaler;
    tf: typeof tf;
  }
}
