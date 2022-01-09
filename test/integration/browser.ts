import fs from 'fs';
import path from 'path';
import webdriver from 'selenium-webdriver';
import browserstack from 'browserstack-local';
import { checkImage } from '../lib/utils/checkImage';
import { bundle, DIST } from '../lib/generic-server/server';
import { startServer } from '../lib/shared/server';

const JEST_TIMEOUT = 60 * 1000;

const TRACK_TIME = false;
const PORT = 8099;
const LOCALHOST = 'localhost';
const ROOT_URL = `http://${LOCALHOST}:${PORT}`;

const DEFAULT_CAPABILITIES = {
  'build': process.env.BROWSERSTACK_BUILD_NAME,
  'project': process.env.BROWSERSTACK_PROJECT_NAME,
  'browserstack.local': true,
  // 'browserstack.localIdentifier': process.env.BROWSERSTACK_LOCAL_IDENTIFIER,
}

const username = process.env.BROWSERSTACK_USERNAME;
const accessKey = process.env.BROWSERSTACK_ACCESS_KEY;
const serverURL = `http://${username}:${accessKey}@hub-cloud.browserstack.com/wd/hub`;

jest.setTimeout(JEST_TIMEOUT); // 60 seconds timeout

//   {
//     "os": "OS X",
//     "os_version": "Big Sur",
//     "browserName": "safari",
//     "browser_version": "latest"
//   },
// {
//   "os_version": "15",
//   "device": "iPhone XS",
//   "real_mobile": "true",
//   "browserName": "iPhone"
// },

interface BrowserOption {
  os?: string;
  os_version: string;
  browser?: string;
  browser_version?: string;
  device?: string;
  real_mobile?: 'true';
  browserName?: string;
}

const startBsLocal = (bsLocal) => new Promise(resolve => {
  bsLocal.start({
    'key': process.env.BROWSERSTACK_ACCESS_KEY,
    // 'localIdentifier': process.env.BROWSERSTACK_LOCAL_IDENTIFIER,
    'force': true,
    'onlyAutomate': 'true',
    'forceLocal': 'true',
  }, resolve);
});

const browserOptions: Array<BrowserOption> = JSON.parse(fs.readFileSync(path.resolve(__dirname, './config/browserOptions.json'), 'utf8'))

describe('Browser Tests', () => {
  let server;
  let bsLocal;


  beforeAll(async function beforeAll(done) {
    const start = new Date().getTime();
    const startBrowserStack = async () => {
      bsLocal = new browserstack.Local();
      await startBsLocal(bsLocal);
    };

    const startServerWrapper = async () => {
      await bundle();
      server = await startServer(PORT, DIST);
    };

    await Promise.all([
      startBrowserStack(),
      startServerWrapper(),
    ]);

    const end = new Date().getTime();
    if (TRACK_TIME) {
      console.log(`Completed pre-pre-test scaffolding in ${Math.round((end - start) / 1000)} seconds`);
    }
    done();
  });

  afterAll(async function afterAll(done) {
    const start = new Date().getTime();
    const stopBrowserstack = () => new Promise(resolve => {
      if (bsLocal && bsLocal.isRunning()) {
        bsLocal.stop(resolve);
      }
    });

    const stopServer = () => new Promise((resolve) => {
      if (server) {
        server.close(resolve);
      } else {
        console.warn('No server found')
        resolve();
      }
    });
    await Promise.all([
      stopBrowserstack(),
      stopServer(),
    ]);
    const end = new Date().getTime();
    if (TRACK_TIME) {
      console.log(`Completed post-post-test clean up in ${Math.round((end - start) / 1000)} seconds`);
    }
    done();
  });

  describe.each(browserOptions)("Browser %j", (capabilities) => {
    let driver;

    beforeAll(function beforeAll() {
      driver = new webdriver.Builder()
        .usingServer(serverURL)
        .withCapabilities({
          ...DEFAULT_CAPABILITIES,
          ...capabilities,
        })
        .build();
    });

    afterAll(function afterAll() {
      return driver.quit();
    });

    beforeEach(async function beforeEach() {
      await driver.get(ROOT_URL);
    });

    it("upscales an imported local image path", async () => {
      const result = await driver.executeScript(() => {
        return window['upscaler'].upscale(window['flower']);
      });
      checkImage(result, "upscaled-4x.png", 'diff.png');
    });
  });
});
