/****
 * Tests that different supported image formats all upscale correctly.
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

describe('Image Format Integration Tests', () => {
  let server;
  let bsLocal;
  let driver;

  const PORT = 8099;

  beforeAll(async function beforeAll() {
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
  }, 20000);

  afterAll(async function imageAfterAll() {
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
  }, 10000);

  beforeEach(async function beforeEach() {
    await driver.get(`http://localhost:${PORT}`);
  });

  it("upscales an imported local image path", async () => {
    const result = await driver.executeScript(() => {
      const upscaler = new window['Upscaler']({
        model: '/pixelator/pixelator.json',
        scale: 4,
      });
      return upscaler.upscale(window['flower']);
    });
    checkImage(result, "upscaled-4x-pixelator.png", 'diff.png');
  });

  it("upscales an HTML Image", async () => {
    const upscaledSrc = await driver.executeScript(() => new Promise(resolve => {
      const upscaler = new window['Upscaler']({
        model: '/pixelator/pixelator.json',
        scale: 4,
      });
      const img = new Image();
      img.src = window['flower'];
      img.onload = function () {
        upscaler.upscale(img).then(resolve);
      }
    }));
    checkImage(upscaledSrc, "upscaled-4x-pixelator.png", 'diff.png');
  });

    it("upscales an HTML Image from the page", async () => {
      const upscaledSrc = await driver.executeScript(() => new Promise(resolve => {
        const upscaler = new window['Upscaler']({
          model: '/pixelator/pixelator.json',
          scale: 4,
        });
        const img = document.createElement('img');
        img.id = 'img';
        img.src = window['flower'];
        document.body.append(img);
        img.onload = () => {
          upscaler.upscale(document.getElementById('img')).then(resolve);
        }
      }));
      checkImage(upscaledSrc, "upscaled-4x-pixelator.png", 'diff.png');
    });


    it("upscales a tensor", async () => {
      const upscaledSrc = await driver.executeScript(() => new Promise(resolve => {
        const upscaler = new window['Upscaler']({
          model: '/pixelator/pixelator.json',
          scale: 4,
        });
        const img = new Image();
        img.src = window['flower'];
        img.crossOrigin = 'anonymous';
        img.onload = function () {
          const tensor = window['tf'].browser.fromPixels(img);
          upscaler.upscale(tensor).then(resolve);
        }
      }));
      checkImage(upscaledSrc, "upscaled-4x-pixelator.png", 'diff.png');
    });

    it("upscales a base64 png path", async () => {
      const data = fs.readFileSync(path.resolve(__dirname, "../../__fixtures__", 'flower-small.png')).toString('base64');
      const originalImage = `data:image/png;base64,${data}`;
      const upscaledSrc = await driver.executeScript(src => {
        const upscaler = new window['Upscaler']({
          model: '/pixelator/pixelator.json',
          scale: 4,
        });
        return upscaler.upscale(src);
      }, originalImage);
      checkImage(upscaledSrc, "upscaled-4x-pixelator.png", 'diff.png');
    });
});
