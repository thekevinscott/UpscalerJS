/****
 * Tests that different approaches to loading a model all load correctly
 */
import * as fs from 'fs';
import * as path from 'path';
import * as browserstack from 'browserstack-local';
import * as webdriver from 'selenium-webdriver';
import { checkImage } from '../../lib/utils/checkImage';
import { bundle, DIST } from '../../lib/esm-esbuild/prepare';
import { startServer } from '../../lib/shared/server';

const DEFAULT_CAPABILITIES = {
  'build': process.env.BROWSERSTACK_BUILD_NAME,
  'project': process.env.BROWSERSTACK_PROJECT_NAME,
  'browserstack.local': true,
  // 'browserstack.localIdentifier': process.env.BROWSERSTACK_LOCAL_IDENTIFIER,
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

const startBsLocal = (bsLocal) => new Promise(resolve => {
  bsLocal.start({
    'key': process.env.BROWSERSTACK_ACCESS_KEY,
    // 'localIdentifier': process.env.BROWSERSTACK_LOCAL_IDENTIFIER,
    'force': true,
    'onlyAutomate': 'true',
    'forceLocal': 'true',
  }, resolve);
});

describe('Model Loading Integration Tests', () => {
  let server;
  let bsLocal;
  let driver;

  const PORT = 8099;

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
      driver.quit(),
    ]);
    const end = new Date().getTime();
    if (TRACK_TIME) {
      console.log(`Completed post-test clean up in ${Math.round((end - start) / 1000)} seconds`);
    }
    done();
  });

  beforeEach(async function beforeEach() {
    await driver.get(`http://localhost:${PORT}`);
  });

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
});
