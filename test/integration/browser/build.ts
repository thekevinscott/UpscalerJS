/****
 * Tests that different build outputs all function correctly
 */
import * as browserstack from 'browserstack-local';
import * as webdriver from 'selenium-webdriver';
import { checkImage } from '../../lib/utils/checkImage';
import { prepareScriptBundleForUMD, DIST as SCRIPT_DIST } from '../../lib/umd/prepare';
import { startServer } from '../../lib/shared/server';
import { prepareScriptBundleForESM, bundleWebpack, DIST as WEBPACK_DIST } from '../../lib/esm-webpack/prepare';

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
jest.retryTimes(1);

let server;
let driver;
describe('Build Integration Tests', () => {

  const PORT = 8099;

  beforeAll(async function beforeAll() {
    const start = new Date().getTime();

    driver = new webdriver.Builder()
      .usingServer(serverURL)
      .withCapabilities(DEFAULT_CAPABILITIES)
      .build();

    const end = new Date().getTime();
    if (TRACK_TIME) {
      console.log(`Completed pre-test scaffolding in ${Math.round((end - start) / 1000)} seconds`);
    }
  }, 20000);

  afterAll(async function buildAfterAll() {
    const start = new Date().getTime();

    await Promise.all([
      driver.quit(),
    ]);
    const end = new Date().getTime();
    const wait = dur => new Promise(resolve => setTimeout(resolve, dur));
    await wait(30000);
    if (TRACK_TIME) {
      console.log(`Completed post-test clean up in ${Math.round((end - start) / 1000)} seconds`);
    }
  }, 20000);

  afterEach(async function afterEach() {
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
