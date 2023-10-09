/****
 * Tests that different browsers all upscale correctly
 */
import path from 'path';
import Upscaler from 'upscaler';
import { test, describe, } from 'vitest';
import * as tf from '@tensorflow/tfjs';
import { ESBUILD_DIST as ESBUILD_DIST_FOLDER } from '../../../lib/esm-esbuild/prepare.js';
import { executeAsyncScript, getBrowserOptions, getDriver, printLogs } from '@internals/webdriver';
import { getCurrentBranch } from '@internals/common/git';
import { checkImage } from '../../../lib/utils/checkImage.js';
import { BrowserTestRunner } from '../../utils/BrowserTestRunner.js';
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

// const ROOT_BUNDLER_OUTPUT_DIR = process.env.ROOT_BUNDLER_OUTPUT_DIR;
// if (typeof ROOT_BUNDLER_OUTPUT_DIR !== 'string') {
//   throw new Error('ROOT_BUNDLER_OUTPUT_DIR not defined in env');
// }
// const ESBUILD_DIST_FOLDER = path.resolve(ROOT_BUNDLER_OUTPUT_DIR, 'esbuild/dist')

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
    console.log('beforeall complete')
  }, 20000);

  afterAll(async function browserAfterAll() {
    await testRunner.afterAll();
    console.log('afterall complete')
  }, 10000);

  let driver: ReturnType<typeof getDriver>;
  afterEach(async () => {
    await driver?.quit();
    console.log('aftereach complete')
  });

  test.each(browserOptions.slice(0, 1))("%j", async (capabilities: BrowserOption) => {
    driver = getDriver({ ...capabilities, build }, { verbose: VERBOSE });
    const ROOT_URL = await testRunner.getServerURL();;
    await driver.get(ROOT_URL);
    await driver.wait(async () => {
      const title = await driver.getTitle();
      return title.endsWith('| Loaded');
    }, 3000);

    const fixturePath = `${await testRunner.getFixturesServerURL()}/pixel-upsampler/test/__fixtures__/fixture.png`;
    const result = await executeAsyncScript(driver, ({ fixturePath }) => {
      const Upscaler = window['Upscaler'] as any;
      const model = window['pixel-upsampler']['x4'];
      if (!model) {
        throw new Error('No model found for pixel upsampler');
      }
      const upscaler = new Upscaler({
        model: {
          ...model,
          path: '/models/pixel-upsampler/models/x4/x4.json',
        }
      });
      const data = upscaler.execute(fixturePath);
      document.body.querySelector('#output')!.innerHTML = `${document.title} | Complete`;
      return data;
    }, { fixturePath, });
    await printLogs(driver, capabilities);
    checkImage(result, path.resolve(PIXEL_UPSAMPLER_DIR, "x4/result.png"), 'diff.png');
    // driver = getDriver({ ...capabilities, build }, { verbose: VERBOSE });
    // const ROOT_URL = testRunner.serverURL;
    // console.log('test1', ROOT_URL)
    // await driver.get(ROOT_URL);
    // console.log('test2')
    // await driver.wait(async () => {
    //   const title = await driver.getTitle();
    //   console.log(title)
    //   return title.endsWith('| Loaded');
    // }, 3000);
    // console.log('test3')

    // expect(1).toBe(2);
    // const fixturePath = `${testRunner.serverURL}/pixel-upsampler/test/__fixtures__/fixture.png`;
    // const result = await executeAsyncScript(driver, ({ fixturePath }) => {
    //   const Upscaler = window['Upscaler'] as any;
    //   const upscaler = new Upscaler({
    //     model: window['@upscalerjs/pixel-upsampler/4x']
    //   });
    //   const data = upscaler.execute(fixturePath);
    //   document.body.querySelector('#output')!.innerHTML = `${document.title} | Complete`;
    //   return data;
    // }, { fixturePath, });
    // await printLogs(driver, capabilities);

    // checkImage(result, path.resolve(PIXEL_UPSAMPLER_DIR, "4x/result.png"), 'diff.png');
  });
});

declare global {
  interface Window {
    Upscaler: typeof Upscaler;
    fixtures: Record<string, string>;
    tf: typeof tf;
  }
}