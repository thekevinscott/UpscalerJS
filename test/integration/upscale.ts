import webdriver from 'selenium-webdriver';
import browserstack from 'browserstack-local';
import { checkImage } from '../lib/utils/checkImage';
import { getFixtureAsBuffer } from '../lib/utils/getFixtureAsBuffer';
const { bundle, startServer } = require('../../packages/test-scaffolding/server')

const DEFAULT_CAPABILITIES = {
  'build': process.env.BROWSERSTACK_BUILD_NAME,
  'project': process.env.BROWSERSTACK_PROJECT_NAME,
  'browserstack.local': true,
  // 'browserstack.localIdentifier': process.env.BROWSERSTACK_LOCAL_IDENTIFIER,
}

const username = process.env.BROWSERSTACK_USERNAME;
const accessKey = process.env.BROWSERSTACK_ACCESS_KEY;
const serverURL = `http://${username}:${accessKey}@hub-cloud.browserstack.com/wd/hub`;

jest.setTimeout(30 * 1000); // 30 seconds timeout

const startBsLocal = (bsLocal) => new Promise(resolve => {
  bsLocal.start({
    'key': process.env.BROWSERSTACK_ACCESS_KEY,
    // 'localIdentifier': process.env.BROWSERSTACK_LOCAL_IDENTIFIER,
    'force': true,
    'onlyAutomate': 'true',
    'forceLocal': 'true',
  }, resolve);
});

describe.each([
  {
    'os': 'windows',
    'os_version': '10',
    'browserName': 'chrome',
    'browser_version' : 'latest',
  },
  // {
  //   'os': 'windows',
  //   'os_version': '10',
  //   'browserName': 'firefox',
  //   'browser_version' : 'latest',
  // },
  // {
  //   'os': 'windows',
  //   'os_version': '10',
  //   'browserName': 'chrome',
  //   'browser_version' : 'latest',
  // },
  // {
  //   'os': 'mac',
  //   'browserName': 'safari',
  //   'browser_version' : 'latest',
  // },
])("Upscale", (capabilities) => {
  let driver;
  let server;
  let bsLocal;

  const PORT = 8099;

  beforeAll(async function beforeAll(done) {
    const start = new Date().getTime();
    const startBrowserStack = async () => {
      bsLocal = new browserstack.Local();
      await startBsLocal(bsLocal);
    };

    const startDriver = () => {
      driver = new webdriver.Builder()
        .usingServer(serverURL)
        .withCapabilities({
          ...DEFAULT_CAPABILITIES,
          ...capabilities,
        })
        .build();
    };

    const startServerWrapper = async () => {
      await bundle();
      server = await startServer(PORT);
    };

    await Promise.all([
      startBrowserStack(),
      startServerWrapper(),
    ]);
    startDriver();

    const end = new Date().getTime();
    console.log(`Completed pre-test scaffolding in ${Math.round((end - start) / 1000)} seconds`);
    done();
  });

  afterAll(async function afterAll (done) {
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
      driver.quit(),
      stopBrowserstack(),
      stopServer(),
    ]);
    const end = new Date().getTime();
    console.log(`Completed post-test clean up in ${Math.round((end - start) / 1000)} seconds`);
    done();
  });

  beforeEach(async function beforeEach () {
    await driver.get(`http://localhost:${PORT}`);
  });

  it("upscales an imported local image path", async () => {
    const result = await driver.executeScript(() => {
      return window['upscaler'].upscale(window['flower']);
    });
    checkImage(result, "upscaled-4x.png", 'diff.png');
  });

  it("upscales an HTML Image", async () => {
    const upscaledSrc = await driver.executeScript(async () => await new Promise(async resolve => {
      const img = new Image();
      img.src = window['flower'];
      img.onload = async function () {
        const upscaledImgSrc = await window['upscaler'].upscale(img);
        resolve(upscaledImgSrc);
      }
    }));
    checkImage(upscaledSrc, "upscaled-4x.png", 'diff.png');
  });

  it("upscales an HTML Image from the page", async () => {
    const upscaledSrc = await driver.executeScript(async () => await new Promise(async resolve => {
      const img = document.createElement('img');
      img.id = 'img';
      img.src = window['flower'];
      document.body.append(img);
      const upscaledImgSrc = await window['upscaler'].upscale(document.getElementById('img'));
      resolve(upscaledImgSrc);
    }));
    checkImage(upscaledSrc, "upscaled-4x.png", 'diff.png');
  });

  it("upscales a tensor", async () => {
    const upscaledSrc = await driver.executeScript(async () => await new Promise(async resolve => {
      const img = new Image();
      img.src = window['flower'];
      img.crossOrigin = 'anonymous';
      img.onload = async function () {
        const tensor = window['tfjs'].browser.fromPixels(img);
        const upscaledImgSrc = await window['upscaler'].upscale(tensor);
        resolve(upscaledImgSrc);
      }
    }));
    checkImage(upscaledSrc, "upscaled-4x.png", 'diff.png');
  });

  /*
  it("upscales a base64 png path", async () => {
    const test = await driver.executeScript(arg => arg, 'foo');
    console.log('test', test);
    const originalImage = getFixtureAsBuffer('flower-small.png');
    console.log('original', originalImage);
    const upscaledSrc = await driver.executeScript(async (src) => {
      return await window['upscaler'].upscale(src);
    }, originalImage);
    // const upscaledSrc = await driver.executeScript(src => window['upscaler'].upscale(src), originalImage);
    checkImage(upscaledSrc, "upscaled-4x.png", 'diff.png');
  });
  */
});
