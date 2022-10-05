/****
 * Tests that different browsers all upscale correctly
 */
import fs from 'fs';
import path from 'path';
import webdriver, { logging } from 'selenium-webdriver';
import { checkImage } from '../../lib/utils/checkImage';
import { bundle, DIST, mockCDN as esbuildMockCDN } from '../../lib/esm-esbuild/prepare';
import Upscaler from '../../../packages/upscalerjs';
import * as tf from '@tensorflow/tfjs';
import { BrowserTestRunner } from '../utils/BrowserTestRunner';
import { BrowserOption, getBrowserOptions, getDriver, printLogs, serverURL } from '../../../scripts/package-scripts/utils/browserStack';


const TRACK_TIME = true;
const PORT = 8099;
const DEFAULT_LOCALHOST = 'localhost';


const JEST_TIMEOUT = 60 * 1000;
jest.setTimeout(JEST_TIMEOUT); // 60 seconds timeout
jest.retryTimes(5);



// const getCapabilityName = (capability: BrowserOption) => {
//   if (capability.os) {
//     return `${capability.os} | ${capability.browserName}`;
//   }
//   if (capability.device) {
//     return `${capability.browserName} | ${capability.device}`;
//   }

//   return JSON.stringify(capability)
// }

const browserOptions = getBrowserOptions(option => {
  // return option?.os !== 'windows' && option?.os !== 'OS X';
  // return option?.os === 'OS X';
  return !option.browserName?.toLowerCase().includes('iphone');
});

describe('Browser Integration Tests', () => {
  const testRunner = new BrowserTestRunner({
    // TODO: Not sure how to proxy with Selenium
    // mockCDN: esbuildMockCDN,
    dist: DIST,
    trackTime: TRACK_TIME,
    port: PORT,
  });

  beforeAll(async function browserBeforeAll() {
    testRunner.beforeAll(bundle);
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
      driver = getDriver(capabilities);
      const ROOT_URL = `http://${capabilities.localhost || DEFAULT_LOCALHOST}:${PORT}`;
      await driver.get(ROOT_URL);
      await driver.wait(async () => {
        const title = await driver.getTitle();
        return title.endsWith('| Loaded');
      }, 3000);
      const result = await driver.executeScript(() => {
        const upscaler = new window['Upscaler']({
          model: {
            path: '/pixelator/pixelator.json',
            scale: 4,
          },
        });
        const data = upscaler.upscale(window['flower']);
        document.body.querySelector('#output')!.innerHTML = `${document.title} | Complete`;
        return data;
      });

      printLogs(driver, capabilities);
      checkImage(result, "upscaled-4x-pixelator.png", 'diff.png');
    });
  });
});

declare global {
  interface Window {
    Upscaler: typeof Upscaler;
    flower: string;
    tf: typeof tf;
  }
}
