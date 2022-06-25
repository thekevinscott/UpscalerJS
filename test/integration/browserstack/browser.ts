/****
 * Tests that different browsers all upscale correctly
 */
import fs from 'fs';
import path from 'path';
import * as http from 'http';
import webdriver, { logging } from 'selenium-webdriver';
import { checkImage } from '../../lib/utils/checkImage';
import { bundle, DIST } from '../../lib/esm-esbuild/prepare';
import { startServer } from '../../lib/shared/server';
import Upscaler from '../../../packages/upscalerjs';
import * as tf from '@tensorflow/tfjs';

const prefs = new logging.Preferences();
prefs.setLevel(logging.Type.BROWSER, logging.Level.INFO);

const TRACK_TIME = true;
const PORT = 8099;
const DEFAULT_LOCALHOST = 'localhost';

const DEFAULT_CAPABILITIES = {
  'build': process.env.BROWSERSTACK_BUILD_NAME,
  'project': process.env.BROWSERSTACK_PROJECT_NAME,
  'browserstack.local': true,
  // 'browserstack.localIdentifier': process.env.BROWSERSTACK_LOCAL_IDENTIFIER,
}

const username = process.env.BROWSERSTACK_USERNAME;
const accessKey = process.env.BROWSERSTACK_ACCESS_KEY;
const serverURL = `http://${username}:${accessKey}@hub-cloud.browserstack.com/wd/hub`;

const JEST_TIMEOUT = 60 * 1000;
jest.setTimeout(JEST_TIMEOUT); // 60 seconds timeout
jest.retryTimes(10);


interface BrowserOption {
  os?: string;
  os_version: string;
  browser?: string;
  browser_version?: string;
  device?: string;
  real_mobile?: 'true';
  browserName?: string;
  localhost?: string;
}

const browserOptionsPath = path.resolve(__dirname, './config/browserOptions.json');

const browserOptions: Array<BrowserOption> = JSON.parse(fs.readFileSync(browserOptionsPath, 'utf8')).filter((option: BrowserOption) => {
  // return option?.os !== 'windows' && option?.os !== 'OS X';
  // return option?.os === 'OS X';
  return !option.browserName.toLowerCase().includes('iphone');
});

const shouldPrintLogs = (entry: webdriver.logging.Entry, capabilities: BrowserOption) => {
  if (entry.message.includes('favicon')) {
    return false;
  }

  // if running in IE, it appears TFJS is already available? Ignore warnings
  // about the TFJS backend already being registered
  if (entry.level.name === 'WARNING' && capabilities?.browserName === 'edge') {
    return false;
  }

  return true;
}

const printLogs = (driver: webdriver.WebDriver, capabilities: BrowserOption) => {
  if (capabilities?.browserName === 'firefox') {
    if (capabilities?.os === 'windows') {
      // There is a bug with Firefox not supporting the get logs method on Windows
      // https://stackoverflow.com/questions/59192232/selenium-trying-to-get-firefox-console-logs-results-in-webdrivererror-http-me
      return;
    }
    if (capabilities?.os === 'OS X') {
      // Firefox does not seem to support logging on OS X either
      // https://github.com/mozilla/geckodriver/issues/1698
      return;
    }
  }

  if (capabilities?.browserName === 'safari') {
    // It looks like Safari also does not support logging
    return;
  }

  driver.manage().logs().get(logging.Type.BROWSER).then(entries => {
    entries.forEach(entry => {
      if (shouldPrintLogs(entry, capabilities)) {
        console.log('LOG [%s] %s', entry.level.name, entry.message, capabilities);
      }
    });
  });
}

const getCapabilityName = (capability: BrowserOption) => {
  if (capability.os) {
    return `${capability.os} | ${capability.browserName}`;
  }
  if (capability.device) {
    return `${capability.browserName} | ${capability.device}`;
  }

  return JSON.stringify(capability)
}

describe('Browser Integration Tests', () => {
  let server: http.Server;

  beforeAll(async function beforeAll() {
    const start = new Date().getTime();

    const startServerWrapper = async () => {
      await bundle();
      server = await startServer(PORT, DIST);
    };

    await startServerWrapper();

    const end = new Date().getTime();
    if (TRACK_TIME) {
      console.log(`Completed pre-test scaffolding in ${Math.round((end - start) / 1000)} seconds`);
    }
  }, 20000);

  afterAll(async function browserAfterAll() {
    const start = new Date().getTime();

    const stopServer = (): Promise<void | Error> => new Promise((resolve) => {
      if (server) {
        server.close(resolve);
      } else {
        console.warn('No server found')
        resolve();
      }
    });
    await Promise.all([
      stopServer(),
    ]);
    const end = new Date().getTime();
    if (TRACK_TIME) {
      console.log(`Completed post-post-test clean up in ${Math.round((end - start) / 1000)} seconds`);
    }
  }, 10000);

  describe.each(browserOptions)("Browser %j", (capabilities: BrowserOption) => {
    it("upscales an imported local image path", async () => {
      console.log('test', getCapabilityName(capabilities))
      const driver = await new webdriver.Builder()
        .usingServer(serverURL)
        .setLoggingPrefs(prefs)
        .withCapabilities({
          ...DEFAULT_CAPABILITIES,
          ...capabilities,
        })
        .build();
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
        document.body.querySelector('#output').innerHTML = `${document.title} | Complete`;
        return data;
      });

      printLogs(driver, capabilities);
      checkImage(result, "upscaled-4x-pixelator.png", 'diff.png');
      await driver.quit();
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
