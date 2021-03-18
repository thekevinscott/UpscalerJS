jest.setTimeout(60000);
const webdriver = require('selenium-webdriver');
const { bundle, startServer } = require('../lib/webpack-bundler/server')
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
// const serverURL = argv.ci ? 'http://hub-cloud.browserstack.com/wd/hub' : `http://${username}:${accessKey}@hub-cloud.browserstack.com/wd/hub`;
const serverURL = `http://${username}:${accessKey}@hub-cloud.browserstack.com/wd/hub`;

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

  beforeAll(async () => {
    driver = new webdriver.Builder()
      .usingServer(serverURL)
      .withCapabilities({
        ...DEFAULT_CAPABILITIES,
        ...capabilities,
      })
      .build();

    if (argv.ci !== true || true) {
      console.log('not in ci, start up browserstack-local')
      bsLocal = new browserstack.Local();
      bsLocal.start({
        'key': process.env.BROWSERSTACK_ACCESS_KEY,
        // 'localIdentifier': process.env.BROWSERSTACK_LOCAL_IDENTIFIER,
        'force': true,
        'onlyAutomate': 'true',
        'forceLocal': 'true',
      }, () => { });
    } else {
      console.log('in ci, no need for browserstack-local')
    }
    
    try {
      await bundle();
      server = await startServer(PORT);
    } catch (err) {
      console.error(err);
      throw err;
    }
  })

  afterAll(async (done) => {
    await driver.quit();

    if (argv.ci !== true && bsLocal && bsLocal.isRunning() || true) {
      bsLocal.stop(() => {});
    }
    
    if (server) {
      server.close(done);
    } else {
      console.warn('No server found')
    }
  });

  it(`sanity check | ${JSON.stringify(capabilities)}`, async () => {
    const rootURL = 'http://127.0.0.1';
    const url = `${rootURL}:${PORT}`;
    await driver.get(url);
    const title = await driver.getTitle();
    expect(title).toEqual('UpscalerJS Integration Test Webpack Bundler Server');
  }, 60000);

  // it("upscales an imported local image path", async () => {
  //   await driver.get(`http://localhost:${PORT}`);
  //   const upscaledSrc = await page.evaluate(async ([]) => {
  //     return await window.upscaler.upscale(window.flower);
  //   }, []);
  //   checkImage(upscaledSrc, "upscaled-4x.png", 'diff.png');
  // });
});
