/****
 * Tests that different approaches to loading a model all load correctly
 */
import * as webdriver from 'selenium-webdriver';
import { checkImage } from '../../lib/utils/checkImage';
import { bundle, DIST } from '../../lib/esm-esbuild/prepare';
import { startServer } from '../../lib/shared/server';

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
jest.setTimeout(JEST_TIMEOUT); // 60 seconds timeout
jest.retryTimes(1);

describe('Model Loading Integration Tests', () => {
  let server;
  let driver;

  const PORT = 8099;

  beforeAll(async function beforeAll() {
    const start = new Date().getTime();

    const startServerWrapper = async () => {
      await bundle();
      server = await startServer(PORT, DIST);
    };

    await startServerWrapper();

    driver = new webdriver.Builder()
      .usingServer(serverURL)
      .withCapabilities(DEFAULT_CAPABILITIES)
      .build();

    const end = new Date().getTime();
    if (TRACK_TIME) {
      console.log(`Completed pre-test scaffolding in ${Math.round((end - start) / 1000)} seconds`);
    }
  }, 20000);

  afterAll(async function modelAfterAll() {
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
      driver.quit(),
    ]);
    const end = new Date().getTime();
    if (TRACK_TIME) {
      console.log(`Completed post-test clean up in ${Math.round((end - start) / 1000)} seconds`);
    }
  }, 10000);

  beforeEach(async function beforeEach() {
    await driver.get(`http://localhost:${PORT}`);
  }, 10000);

  it("loads a locally exposed model via implied HTTP", async () => {
    const result = await driver.executeScript(() => {
      const upscaler = new window['Upscaler']({
        model: '/pixelator/pixelator.json',
        scale: 4,
      });
      return upscaler.upscale(window['flower']);
    });
    checkImage(result, "upscaled-4x-pixelator.png", 'diff.png');
  });

  it("loads a locally exposed model via absolute HTTP", async () => {
    const result = await driver.executeScript(() => {
      const upscaler = new window['Upscaler']({
        model: `${window.location.origin}/pixelator/pixelator.json`,
        scale: 4,
      });
      return upscaler.upscale(window['flower']);
    });
    checkImage(result, "upscaled-4x-pixelator.png", 'diff.png');
  });

  it("can load model definitions in the browser", async () => {
    const result = await driver.executeScript(() => {
      const upscaler = new window['Upscaler']();
      return upscaler.getModelDefinitions();
    });
    expect(result['pixelator']).toEqual({
      urlPath: 'pixelator',
      scale: 4,
    });
  });
});
