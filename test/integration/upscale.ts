import * as path from 'path';
import * as fs from 'fs';
import * as browserstack from 'browserstack-local';
import * as webdriver from 'selenium-webdriver';
import { checkImage } from '../lib/utils/checkImage';
import { bundle, startServer } from '../../packages/test-scaffolding/server';

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

const username = process.env.BROWSERSTACK_USERNAME;
const accessKey = process.env.BROWSERSTACK_ACCESS_KEY;
const serverURL = `http://${username}:${accessKey}@hub-cloud.browserstack.com/wd/hub`;

const JEST_TIMEOUT = 60 * 1000;
jest.setTimeout(JEST_TIMEOUT); // 60 seconds timeout

const startBsLocal = (bsLocal) => new Promise(resolve => {
  bsLocal.start({
    'key': process.env.BROWSERSTACK_ACCESS_KEY,
    // 'localIdentifier': process.env.BROWSERSTACK_LOCAL_IDENTIFIER,
    'force': true,
    'onlyAutomate': 'true',
    'forceLocal': 'true',
  }, resolve);
});


describe('Upscale', () => {
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
      server = await startServer(PORT);
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
    console.log(`Completed pre-test scaffolding in ${Math.round((end - start) / 1000)} seconds`);
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
    console.log(`Completed post-test clean up in ${Math.round((end - start) / 1000)} seconds`);
    done();
  });


  beforeEach(async function beforeEach() {
    await driver.get(`http://localhost:${PORT}`);
  });

  it("upscales an imported local image path", async () => {
    const result = await driver.executeScript(() => {
      return window['upscaler'].upscale(window['flower']);
    });
    checkImage(result, "upscaled-4x.png", 'diff.png');
  });

  it("upscales an HTML Image", async () => {
    const upscaledSrc = await driver.executeScript(() => new Promise(resolve => {
      const img = new Image();
      img.src = window['flower'];
      img.onload = function () {
        window['upscaler'].upscale(img).then(resolve);
      }
    }));
    checkImage(upscaledSrc, "upscaled-4x.png", 'diff.png');
  });

    it("upscales an HTML Image from the page", async () => {
      const upscaledSrc = await driver.executeScript(() => new Promise(resolve => {
        const img = document.createElement('img');
        img.id = 'img';
        img.src = window['flower'];
        document.body.append(img);
        img.onload = () => {
          window['upscaler'].upscale(document.getElementById('img')).then(resolve);
        }
      }));
      checkImage(upscaledSrc, "upscaled-4x.png", 'diff.png');
    });

    it("upscales a tensor", async () => {
      const upscaledSrc = await driver.executeScript(() => new Promise(resolve => {
        const img = new Image();
        img.src = window['flower'];
        img.crossOrigin = 'anonymous';
        img.onload = function () {
          const tensor = window['tfjs'].browser.fromPixels(img);
          window['upscaler'].upscale(tensor).then(resolve);
        }
      }));
      checkImage(upscaledSrc, "upscaled-4x.png", 'diff.png');
    });

    it("upscales a base64 png path", async () => {
      const data = fs.readFileSync(path.resolve(__dirname, "../__fixtures__", 'flower-small.png')).toString('base64');
      const originalImage = `data:image/png;base64,${data}`;
      const upscaledSrc = await driver.executeScript(src => window['upscaler'].upscale(src), originalImage);
      checkImage(upscaledSrc, "upscaled-4x.png", 'diff.png');
    });
});
