/****
 * Tests that different browsers all upscale correctly
 */
import fs from 'fs';
import path from 'path';
import webdriver, { logging, Capabilities } from 'selenium-webdriver';
import browserstack from 'browserstack-local';
import { checkImage } from '../../lib/utils/checkImage';
import { bundle, DIST } from '../../lib/esm-esbuild/prepare';
import { startServer } from '../../lib/shared/server';
const { By } = require('selenium-webdriver');

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

const browserOptions: Array<BrowserOption> = JSON.parse(fs.readFileSync(browserOptionsPath, 'utf8')).filter(option => {
  // return option?.os !== 'windows' && option?.os !== 'OS X';
  // return option?.os === 'OS X';
  return !option.browserName.toLowerCase().includes('iphone');
});

const shouldPrintLogs = (entry, capabilities) => {
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

const printLogs = (driver, capabilities) => {
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

const getCapabilityName = (capability) => {
  if (capability.os) {
    return `${capability.os} | ${capability.browserName}`;
  }
  if (capability.device) {
    return `${capability.browserName} | ${capability.device}`;
  }

  return JSON.stringify(capability)
}

describe('Browser Integration Tests', () => {
  let server;

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

    const stopServer = () => new Promise((resolve) => {
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

  describe.each(browserOptions)("Browser %j", (capabilities) => {
    it('tests that browser executes correctly sync', async () => {
      console.log('test', getCapabilityName(capabilities))
      const driver = new webdriver.Builder()
        .usingServer(serverURL)
        .setLoggingPrefs(prefs)
        .withCapabilities({
          ...DEFAULT_CAPABILITIES,
          ...capabilities,
        })
        .build();
      const ROOT_URL = `http://${capabilities.localhost || DEFAULT_LOCALHOST}:${PORT}`;
      await driver.get(ROOT_URL);
      const result = await driver.executeScript(() => {
        return 'foo';
      });

      expect(result).toEqual('foo');
      await driver.quit();
    });
    
    it('tests that browser executes correctly async', async () => {
      console.log('test', getCapabilityName(capabilities))
      const driver = new webdriver.Builder()
        .usingServer(serverURL)
        .setLoggingPrefs(prefs)
        .withCapabilities({
          ...DEFAULT_CAPABILITIES,
          ...capabilities,
        })
        .build();
      const ROOT_URL = `http://${capabilities.localhost || DEFAULT_LOCALHOST}:${PORT}`;
      await driver.get(ROOT_URL);
      const result = await driver.executeScript(() => {
        const wait = (dur) => new Promise(resolve => {
          setTimeout(() => resolve(), dur);
        });
        return wait(1000).then(() => {
          return 'foo';
        })
      });

      expect(result).toEqual('foo');
      await driver.quit();
    });

    // it("upscales an imported local image path", async () => {
    //   console.log('test', getCapabilityName(capabilities))
    //   const driver = new webdriver.Builder()
    //     .usingServer(serverURL)
    //     .setLoggingPrefs(prefs)
    //     .withCapabilities({
    //       ...DEFAULT_CAPABILITIES,
    //       ...capabilities,
    //     })
    //     .build();
    //   const ROOT_URL = `http://${capabilities.localhost || DEFAULT_LOCALHOST}:${PORT}`;
    //   await driver.get(ROOT_URL);
    //   await driver.wait(() => driver.getTitle().then(title => title.endsWith('| Loaded'), 3000));
    //   const result = await driver.executeScript(() => {
    //     const upscaler = new window['Upscaler']({
    //       model: '/pixelator/pixelator.json',
    //       scale: 4,
    //     });
    //     const data = upscaler.upscale(window['flower']);
    //     document.body.querySelector('#output').innerHTML = `${document.title} | Complete`;
    //     return data;
    //   });

    //   printLogs(driver, capabilities);
    //   checkImage(result, "upscaled-4x-pixelator.png", 'diff.png');
    //   await driver.quit();
    // });
  });
});
