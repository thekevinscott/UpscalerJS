/****
 * Tests that different browsers all upscale correctly
 */
import path from 'path';
// import { checkImage } from '../../../utils/checkImage.js';
import Upscaler from 'upscaler';
import * as tf from '@tensorflow/tfjs';
import { ClientsideTestRunner } from '@internals/test-runner/clientside';
import { executeAsyncScript, getBrowserOptions, getDriver, printLogs } from '@internals/webdriver';
import { MODELS_DIR } from '@internals/common/constants';
import { getCurrentBranch } from '@internals/git';
// import { TEST_TIMEOUT } from '../vite.config.js';

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
  });

  beforeAll(async function browserBeforeAll() {
    await testRunner.beforeAll();
  }, 20000);

  afterAll(async function browserAfterAll() {
    await testRunner.afterAll();
  }, 10000);

  let driver: ReturnType<typeof getDriver>;
  afterEach(async () => {
    await driver?.quit();
  });

  test.each(browserOptions)("%j", async (capabilities: BrowserOption) => {
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
      const upscaler = new Upscaler({
        model: window['@upscalerjs/pixel-upsampler/4x']
      });
      const data = upscaler.execute(fixturePath);
      document.body.querySelector('#output')!.innerHTML = `${document.title} | Complete`;
      return data;
    }, { fixturePath, });
    await printLogs(driver, capabilities);
    expect(result).toMatchImage(path.resolve(PIXEL_UPSAMPLER_DIR, "4x/result.png"));
  });
});

declare global {
  interface Window {
    Upscaler: typeof Upscaler;
    fixtures: Record<string, string>;
    tf: typeof tf;
  }
}
