import * as browserstack from 'browserstack-local';
import * as webdriver from 'selenium-webdriver';
import { checkImage } from '../lib/utils/checkImage';
import { prepareScriptBundleForUMD, DIST as SCRIPT_DIST } from '../lib/umd/prepare';
import { startServer } from '../lib/shared/server';
import { prepareScriptBundleForESM, bundleWebpack, DIST as WEBPACK_DIST } from '../lib/esm-webpack/prepare';
import { buildUpscalerJS } from '../lib/utils/buildUpscalerJS';

const DEFAULT_CAPABILITIES = {
  'build': process.env.BROWSERSTACK_BUILD_NAME,
  'project': process.env.BROWSERSTACK_PROJECT_NAME,
  'browserstack.local': true,
  os: 'windows',
  os_version: '11',
  browserName: 'chrome',
  browser_version: 'latest'
}

const TRACK_TIME = false;
const username = process.env.BROWSERSTACK_USERNAME;
const accessKey = process.env.BROWSERSTACK_ACCESS_KEY;
const serverURL = `http://${username}:${accessKey}@hub-cloud.browserstack.com/wd/hub`;

const JEST_TIMEOUT = 60 * 1000;
jest.setTimeout(JEST_TIMEOUT * 1); // 60 seconds timeout
jest.retryTimes(3);

const startBsLocal = (bsLocal) => new Promise(resolve => {
  bsLocal.start({
    'key': process.env.BROWSERSTACK_ACCESS_KEY,
    'force': true,
    'onlyAutomate': 'true',
    'forceLocal': 'true',
  }, resolve);
});

describe('Builds', () => {
  let server;
  let bsLocal;
  let driver;

  const PORT = 8099;

  beforeAll(async function beforeAll(done) {
    const start = new Date().getTime();
    buildUpscalerJS('browser');
    const startBrowserStack = async () => {
      bsLocal = new browserstack.Local();
      await startBsLocal(bsLocal);
    };

    await Promise.all([
      startBrowserStack(),
    ]);

      driver = new webdriver.Builder()
        .usingServer(serverURL)
        .withCapabilities(DEFAULT_CAPABILITIES)
        .build();

    const end = new Date().getTime();
    if (TRACK_TIME) {
      console.log(`Completed pre-test scaffolding in ${Math.round((end - start) / 1000)} seconds`);
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

    await Promise.all([
      stopBrowserstack(),
      driver.quit(),
    ]);
    const end = new Date().getTime();
    if (TRACK_TIME) {
      console.log(`Completed post-test clean up in ${Math.round((end - start) / 1000)} seconds`);
    }
    done();
  });

  afterEach(async function afterEach(done) {
    const stopServer = () => new Promise((resolve) => {
      if (server) {
        server.close(resolve);
      } else {
        resolve();
      }
    });
    await Promise.all([
      stopServer(),
    ]);
    done();
  });

  it("upscales using a UMD build via a script tag", async () => {
    await prepareScriptBundleForUMD();
    server = await startServer(PORT, SCRIPT_DIST);
    await driver.get(`http://localhost:${PORT}`);
    const result = await driver.executeScript(() => {
      const Upscaler = window['Upscaler'];
      const upscaler = new Upscaler({
        model: '/pixelator/pixelator.json',
        scale: 4,
      });
      return upscaler.upscale(document.getElementById('flower'));
    });
    checkImage(result, "upscaled-4x-pixelator.png", 'diff.png');
  });

  it("upscales using an ESM build using Webpack", async () => {
    await prepareScriptBundleForESM();
    await bundleWebpack();
    server = await startServer(PORT, WEBPACK_DIST);
    await driver.get(`http://localhost:${PORT}`);
    await driver.wait(() => driver.getTitle().then(title => title.endsWith('| Loaded'), 3000));
    const result = await driver.executeScript(() => {
      const Upscaler = window['Upscaler'];
      const upscaler = new Upscaler({
        model: '/pixelator/pixelator.json',
        scale: 4,
      });
      return upscaler.upscale(window['flower']);
    });
    checkImage(result, "upscaled-4x-pixelator.png", 'diff.png');
  });
});
