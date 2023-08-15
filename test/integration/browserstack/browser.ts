/****
 * Tests that different browsers all upscale correctly
 */
import path from 'path';
import { checkImage } from '../../lib/utils/checkImage';
import { ESBUILD_DIST, mockCDN as esbuildMockCDN } from '../../lib/esm-esbuild/prepare';
import Upscaler from '../../../packages/upscalerjs';
import * as tf from '@tensorflow/tfjs';
import { BrowserTestRunner } from '@internals/test-runner/browser';
import { USE_PUPPETEER, BrowserOption, executeAsyncScript, getBrowserOptions, getSeleniumDriver, getRootURL, printLogs } from '@internals/browserstack';
import { MODELS_DIR } from '../../../scripts/package-scripts/utils/constants';
import { connectPuppeteerForBrowserstack } from '../../../internals/browserstack/src';
import { WebDriver } from 'selenium-webdriver';

const PIXEL_UPSAMPLER_DIR = path.resolve(MODELS_DIR, 'pixel-upsampler/test/__fixtures__');

const TRACK_TIME = true;
const PORT = 8099;
const LOG = true;
const VERBOSE = process.env.verbose === '1';

const JEST_TIMEOUT = 60 * 1000 * 1;
jest.setTimeout(JEST_TIMEOUT);
jest.retryTimes(2);

const browserOptions = getBrowserOptions(option => {
  // return option?.os !== 'windows' && option?.os !== 'OS X';
  // return option?.browserName === 'chrome';
  // return option?.os === 'OS X';
  return !option.browserName?.toLowerCase().includes('iphone') && !option.browserName?.toLowerCase().includes('android') && option.localhost === undefined;
  // return true;
});


describe('Browser Integration Tests', () => {
  const testRunner = new BrowserTestRunner({
    // TODO: Not sure how to proxy with Selenium
    mockCDN: USE_PUPPETEER ? esbuildMockCDN : undefined,
    dist: ESBUILD_DIST,
    trackTime: TRACK_TIME,
    port: PORT,
    verbose: VERBOSE,
    log: LOG,
  });

  beforeAll(async function browserBeforeAll() {
    testRunner.beforeAll(undefined, false);
  }, 20000);

  afterAll(async function browserAfterAll() {
    testRunner.afterAll();
  }, 10000);

  // beforeEach(async function beforeEach() {
  //   // await testRunner.beforeEach('| Loaded');
  // });

  afterEach(async function afterEach() {
    if (_driver) {
      await _driver.quit();
    }
    // console.log('afterEach')
    // await testRunner.closeBrowser();
    // await testRunner.afterEach();
  });

  let _driver: WebDriver;

  describe.each(browserOptions)("Browser %j", (caps: BrowserOption) => {
    it("upscales an imported local image path", async () => {
      let result: string;
      if (USE_PUPPETEER) {
        const browser = await connectPuppeteerForBrowserstack({
          'name': 'upscales an imported local image path',
          ...caps,
        });

        const page = await browser.newPage();
        await page.goto(getRootURL(PORT, caps));

        result = await page.evaluate(() => {
          const upscaler = new window['Upscaler']({
            model: window['pixel-upsampler']['4x'],
          });
          const data = upscaler.execute(window['fixtures']['pixel-upsampler']);
          document.body.querySelector('#output')!.innerHTML = `${document.title} | Complete`;
          return data;
        });
      } else {
        const driver = await getSeleniumDriver(caps, { verbose: VERBOSE });
        _driver = driver;
        await driver.get(getRootURL(PORT, caps));
        await driver.wait(async () => {
          const title = await driver.getTitle();
          return title.endsWith('| Loaded');
        }, 3000);

        const TIMEOUT = JEST_TIMEOUT - 1000 - 3000;

        result = await executeAsyncScript(driver, () => {
          const upscaler = new window['Upscaler']({
            model: window['pixel-upsampler']['4x'],
          });
          const data = upscaler.execute(window['fixtures']['pixel-upsampler']);
          document.body.querySelector('#output')!.innerHTML = `${document.title} | Complete`;
          return data;
        }, {
          timeout: TIMEOUT,
        });
        await printLogs(driver, caps);

      }
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
