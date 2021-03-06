const minute = 60 * 1000;
jest.setTimeout(5 * minute); // 2 minute timeout
const webdriver = require('selenium-webdriver');
const { bundle, startServer } = require('../../packages/test-scaffolding/server')
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

  beforeAll(async () => {
    // const start = new Date().getTime();
    await Promise.all([
      (async () => {
        bsLocal = new browserstack.Local();
        await startBsLocal(bsLocal);
      })(),
      (async () => {
        driver = new webdriver.Builder()
          .usingServer(serverURL)
          .withCapabilities({
            ...DEFAULT_CAPABILITIES,
            ...capabilities,
          })
          .build();
      })(),
      new Promise(async (resolve, reject) => {
        try {
          await bundle();
          server = await startServer(PORT, resolve);
        } catch (err) {
          reject(err);
        }
      })
    ]);

    // const end = new Date().getTime();
    // console.log(`Total build took ${Math.round((end - start) / 1000)} seconds`);
    
  });

  afterAll(async (done) => {
    await Promise.all([
      driver.quit(),
      (async () => {
        if (bsLocal && bsLocal.isRunning()) {
          bsLocal.stop(() => {});
        }
      })(),
      (async () => {
        if (server) {
          server.close(done);
        } else {
          console.warn('No server found')
        }
      })(),
    ]);
  });

  beforeEach(async () => {
    await driver.get(`http://localhost:${PORT}`)
  });

  it(`sanity check | ${JSON.stringify(capabilities)}`, async () => {
    const title = await driver.getTitle();
    expect(title).toEqual('UpscalerJS Integration Test Webpack Bundler Server');
  });

  it("upscales an imported local image path", async () => {
    const upscaledSrc = await driver.executeScript(() => window['upscaler'].upscale(window['flower']));
    checkImage(upscaledSrc, "upscaled-4x.png", 'diff.png');
  });

  it("upscales an HTML Image", async () => {
    const upscaledSrc = await driver.executeScript(() => {
      const img = new Image();
      img.src = window['flower'];
      return window['upscaler'].upscale(img);
    });
    checkImage(upscaledSrc, "upscaled-4x.png", 'diff.png');
  });

  it("upscales an HTML Image from the page", async () => {
    const upscaledSrc = await driver.executeScript(() => {
      const img = document.createElement('img');
      img.id = 'img';
      img.src = window['flower'];
      document.body.appendChild(img)
      return window['upscaler'].upscale(document.getElementById('img'));
    });
    checkImage(upscaledSrc, "upscaled-4x.png", 'diff.png');
  });

  it("upscales a tensor", async () => {
    const upscaledSrc = await driver.executeScript(() => {
      const img = new Image();
      img.src = window['flower'];
      const tensor = window['tfjs'].fromPixels(img);
      return window['upscaler'].upscale(tensor);
    });
    checkImage(upscaledSrc, "upscaled-4x.png", 'diff.png');
  });

  /*
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
