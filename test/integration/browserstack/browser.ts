/****
 * Tests that different browsers all upscale correctly
 */
import path from 'path';
import webdriver from 'selenium-webdriver';
import { checkImage } from '../../lib/utils/checkImage';
import { ESBUILD_DIST, mockCDN as esbuildMockCDN } from '../../lib/esm-esbuild/prepare';
import Upscaler from '../../../packages/upscalerjs';
import * as tf from '@tensorflow/tfjs';
import { BrowserTestRunner } from '../utils/BrowserTestRunner';
import { BrowserOption, executeAsyncScript, getBrowserOptions, getDriver, printLogs, serverURL } from '../../../scripts/package-scripts/utils/browserStack';
import { MODELS_DIR } from '../../../scripts/package-scripts/utils/constants';

const PIXEL_UPSAMPLER_DIR = path.resolve(MODELS_DIR, 'pixel-upsampler/test/__fixtures__');

const TRACK_TIME = true;
const PORT = 8099;
const DEFAULT_LOCALHOST = 'localhost';
const LOG = true;
const VERBOSE = process.env.verbose === '1';


const JEST_TIMEOUT = 60 * 1000 * 1;
jest.setTimeout(JEST_TIMEOUT);
jest.retryTimes(2);

const browserOptions = getBrowserOptions(option => {
  // return option?.os !== 'windows' && option?.os !== 'OS X';
  // return option?.browserName === 'chrome';
  // return option?.os === 'OS X';
  // return !option.browserName?.toLowerCase().includes('iphone');
  return true;
});

describe('Browser Integration Tests', () => {
  const testRunner = new BrowserTestRunner({
    // TODO: Not sure how to proxy with Selenium
    // mockCDN: esbuildMockCDN,
    dist: ESBUILD_DIST,
    trackTime: TRACK_TIME,
    port: PORT,
    verbose: VERBOSE,
    log: LOG,
  });

  beforeAll(async function browserBeforeAll() {
    testRunner.beforeAll();
  }, 20000);

  afterAll(async function browserAfterAll() {
    testRunner.afterAll();
  }, 10000);

  let driver: webdriver.ThenableWebDriver;
  afterEach(async () => {
    await driver.quit();
  });

  describe.each(browserOptions)("Browser %j", (capabilities: BrowserOption) => {
    it("upscales an imported local image path", async () => {
      driver = getDriver(capabilities, { verbose: VERBOSE});
      const ROOT_URL = `http://${capabilities.localhost || DEFAULT_LOCALHOST}:${PORT}`;
      await driver.get(ROOT_URL);
      await driver.wait(async () => {
        const title = await driver.getTitle();
        return title.endsWith('| Loaded');
      }, 3000);

      const TIMEOUT = JEST_TIMEOUT - 1000 - 3000;

      const result = await executeAsyncScript(driver, () => {
        const upscaler = new window['Upscaler']({
          model: window['pixel-upsampler']['4x'],
        });
        const data = upscaler.execute(window['fixtures']['pixel-upsampler']);
        document.body.querySelector('#output')!.innerHTML = `${document.title} | Complete`;
        return data;
      }, {
        timeout: TIMEOUT,
      });
      await printLogs(driver, capabilities);

      checkImage(result, path.resolve(PIXEL_UPSAMPLER_DIR, "4x/result.png"), 'diff.png');
    });
  });
});

declare global {
  interface Window {
    Upscaler: typeof Upscaler;
    fixtures: Record<string, string>;
    tf: typeof tf;
  }
}
