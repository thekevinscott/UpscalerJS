/****
 * Tests that different browsers all upscale correctly
 */
import path from 'path';
import Upscaler from 'upscaler';
import { test, describe, } from 'vitest';
import * as tf from '@tensorflow/tfjs';
import { executeAsyncScript, getBrowserOptions, getDriver, printLogs } from '@internals/webdriver';
import { getCurrentBranch } from '@internals/common/git';
import { checkImage } from '../../../lib/utils/checkImage.js';
import { MODELS_DIR } from '@internals/common/constants';
import { ClientsideTestRunner } from '@internals/test-runner/clientside';

export interface BrowserOption {
  os?: string;
  os_version: string;
  browser?: string;
  browser_version?: string;
  device?: string;
  real_mobile?: 'true';
  browserName?: string;
  localhost?: string;
}

const PIXEL_UPSAMPLER_DIR = path.resolve(MODELS_DIR, 'pixel-upsampler/test/__fixtures__');

const TRACK_TIME = true;
const PORT = 8099;
const LOG = true;
const VERBOSE = process.env.verbose === '1';

const browserOptions = getBrowserOptions(() => {
  // return option?.os !== 'windows' && option?.os !== 'OS X';
  // return option?.browserName === 'chrome';
  // return option?.os === 'OS X';
  // return !option.browserName?.toLowerCase().includes('iphone');
  return true;
});

const build = [getCurrentBranch(), 'Browserstack tests'].join(' / ');

const ROOT_BUNDLER_OUTPUT_DIR = process.env.ROOT_BUNDLER_OUTPUT_DIR;
if (typeof ROOT_BUNDLER_OUTPUT_DIR !== 'string') {
  throw new Error('ROOT_BUNDLER_OUTPUT_DIR not defined in env');
}
const ESBUILD_DIST_FOLDER = path.resolve(ROOT_BUNDLER_OUTPUT_DIR, 'esbuild/dist')

describe('Browser Integration Tests', () => {
  const testRunner = new ClientsideTestRunner({
    // TODO: Not sure how to proxy with Selenium
    // mock: true
    dist: ESBUILD_DIST_FOLDER,
    trackTime: TRACK_TIME,
    port: PORT,
    // verbose: VERBOSE,
    log: LOG,
    useTunnel: true,
  });

  beforeAll(async function browserBeforeAll() {
    await testRunner.beforeAll();
    console.log('server url', await testRunner.getServerURL());
    console.log('fixture url', await testRunner.getFixturesServerURL());
  }, 20000);

  afterAll(async function browserAfterAll() {
    await testRunner.afterAll();
  }, 10000);

  let driver: ReturnType<typeof getDriver>;
  afterEach(async () => {
    await driver?.quit();
  });

  test.each(browserOptions)("%j", async (capabilities: BrowserOption) => {
    console.log(capabilities)
    driver = getDriver({ ...capabilities, build }, { verbose: VERBOSE });
    console.log('got driver')
    const ROOT_URL = await testRunner.getServerURL();;
    await driver.get(ROOT_URL);
    console.log('got root url')
    await driver.wait(async () => {
      const title = await driver.getTitle();
      return title.endsWith('| Loaded');
    }, 3000);
    console.log('got loaded page')

    const fixturePath = `${await testRunner.getFixturesServerURL()}/pixel-upsampler/test/__fixtures__/fixture.png`;
    const modelPath = `${await testRunner.getFixturesServerURL()}/pixel-upsampler/dist/esm/models/pixel-upsampler/src/x4/index.js`;
    console.log('got fixture and model paths')
    const result = await executeAsyncScript(driver, ({ fixturePath, modelPath }) => {
      const Upscaler = window['Upscaler'] as any;
      console.log('got upscaler')
      const model =window["@upscalerjs/pixel-upsampler/x4"];
      console.log("got model")
      if (!model) {
        throw new Error('No model found for pixel upsampler');
      }
      const upscaler = new Upscaler({
        model: {
          ...model,
          path: modelPath,
        }
      });
      const data = upscaler.execute(fixturePath);
      document.body.querySelector('#output')!.innerHTML = `${document.title} | Complete`;
      return data;
    }, { fixturePath, modelPath, });
    await printLogs(driver, capabilities);
    checkImage(result, path.resolve(PIXEL_UPSAMPLER_DIR, "x4/result.png"), 'diff.png');
  }, 30000);
});

declare global {
  interface Window {
    Upscaler: typeof Upscaler;
    fixtures: Record<string, string>;
    tf: typeof tf;
  }
}
