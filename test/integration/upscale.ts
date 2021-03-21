jest.setTimeout(5 * 60 * 1000); // 2 minute timeout
const webdriver = require('selenium-webdriver');
const { startServer } = require('../../packages/test-scaffolding/server')
const checkImage = require('../lib/utils/checkImage');
const browserstack = require('browserstack-local');
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const argv = yargs(hideBin(process.argv)).argv

const DEFAULT_CAPABILITIES = {
  'build': process.env.BROWSERSTACK_BUILD_NAME,
  'project': process.env.BROWSERSTACK_PROJECT_NAME,
  'browserstack.local': true,
  // 'browserstack.localIdentifier': process.env.BROWSERSTACK_LOCAL_IDENTIFIER,
}

const username = process.env.BROWSERSTACK_USERNAME;
const accessKey = process.env.BROWSERSTACK_ACCESS_KEY;
const serverURL = `http://${username}:${accessKey}@hub-cloud.browserstack.com/wd/hub`;

const startBsLocal = (bsLocal) => new Promise(resolve => {
  bsLocal.start({
    'key': process.env.BROWSERSTACK_ACCESS_KEY,
    // 'localIdentifier': process.env.BROWSERSTACK_LOCAL_IDENTIFIER,
    'force': true,
    'onlyAutomate': 'true',
    'forceLocal': 'true',
  }, () => {
    resolve();
  });
});

describe.each([
  {
    'os': 'windows',
    'os_version': '10',
    'browserName': 'firefox',
    'browser_version' : 'latest',
  },
  // {
  //   'os': 'windows',
  //   'os_version': '10',
  //   'browserName': 'chrome',
  //   'browser_version' : 'latest',
  // },
])("Upscale", (capabilities) => {
  let driver;
  let server;
  let bsLocal;

  const PORT = 8099;

  beforeAll(async (done) => {
    bsLocal = new browserstack.Local();
    await startBsLocal(bsLocal);

    driver = new webdriver.Builder()
      .usingServer(serverURL)
      .withCapabilities({
        ...DEFAULT_CAPABILITIES,
        ...capabilities,
      })
      .build();
    
    try {
      server = await startServer(PORT, async () => {
        await driver.get(`http://localhost:${PORT}`);
        done();
      });
    } catch (err) {
      console.error(err);
      throw err;
    }
  }, 5 * 60000);

  afterAll(async (done) => {
    await driver.quit();

    if (bsLocal && bsLocal.isRunning()) {
      bsLocal.stop(() => {});
    }
    
    if (server) {
      server.close(done);
    } else {
      console.warn('No server found')
    }
  }, 5 * 60000);

  it(`sanity check | ${JSON.stringify(capabilities)}`, async () => {
    const title = await driver.getTitle();
    expect(title).toEqual('UpscalerJS Integration Test Webpack Bundler Server');
  });

  it("upscales an imported local image path", async () => {
    const upscaledSrc = await driver.executeScript(() => window.upscaler.upscale(window.flower));
    checkImage(upscaledSrc, "upscaled-4x.png", 'diff.png');
  });

  /*
  it("upscales an HTML image element", async () => {
    const upscaledSrc = await driver.executeScript(() => {
      const img = document.createElement('img');
      img.src = window.flower;
      return window.upscaler.upscale(img);
    });
    checkImage(upscaledSrc, "upscaled-4x.png", 'diff.png');
  });

  /*
  it("upscales a tensor", async () => {
    const page = await context.newPage();
    await page.goto(`http://localhost:${PORT}`);
    page.on('console', console.log);
    const upscaledSrc = await page.evaluate(async ([]) => {
      const img = document.createElement('img');
      img.src = window.flower;
      const tensor = window.tfjs.fromPixels(img);
      return await window.upscaler.upscale(tensor);
    }, []);
    checkImage(upscaledSrc, "upscaled-4x.png", 'diff.png');
  });

  it("upscales a base64 png path", async () => {
    const originalImage = getFixtureAsBuffer('flower.png');
    const page = await context.newPage();
    await page.goto(`http://localhost:${PORT}`);
    page.on('console', console.log);
    const upscaledSrc = await page.evaluate(async ([flower]) => {
      return await window.upscaler.upscale(flower);
    }, [originalImage]);
    checkImage(upscaledSrc, "upscaled-4x.png", 'diff.png');
  });

  // it("upscales an image from the interwebs", async () => {
  //   const page = await context.newPage();
  //   await page.goto(`http://localhost:${PORT}`);
  //   page.on('console', console.log);
  //   const upscaledSrc = await page.evaluate(async ([]) => {
  //     return await window.upscaler.upscale(window.flower);
  //   }, []);
  //   checkImage(upscaledSrc, "upscaled-4x.png", 'diff.png');
  // });
  */
});
