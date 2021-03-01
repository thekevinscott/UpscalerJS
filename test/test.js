require('dotenv').config();
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const argv = yargs(hideBin(process.argv)).argv
const webdriver = require('selenium-webdriver');
const browserstack = require('browserstack-local');
const handler = require('serve-handler');
const http = require('http');
jest.setTimeout(30000);

const DEFAULT_CAPABILITIES = {
  'browser_version': 'latest',
  'browserstack.local': 'true',
  'build': process.env.BROWSERSTACK_BUILD_NAME,
  'project': process.env.BROWSERSTACK_PROJECT_NAME,
  'browserstack.localIdentifier': process.env.BROWSERSTACK_LOCAL_IDENTIFIER,
  'browserstack.user': process.env.BROWSERSTACK_USERNAME,
  'browserstack.key': process.env.BROWSERSTACK_ACCESS_KEY
};

describe.each([
  {
    'os': 'windows',
    'os_version': '10',
    'browserName': 'firefox',
  },
  // {
  //   'os': 'windows',
  //   'os_version': '10',
  //   'browserName': 'chrome',
  // },
])("integration tests", (capabilities) => {
  let driver;
  let bsLocal;
  let server;

  const PORT = 8099;

  beforeAll(async (done) => {
    server = http.createServer((request, response) => handler(request, response, {
      public: 'test/server',
    }));

    if (argv.ci !== true) {
      bsLocal = new browserstack.Local();
      // starts the Local instance with the required arguments
      bsLocal.start({
        'key': process.env.BROWSERSTACK_ACCESS_KEY,
      }, () => {});
    }

    driver = new webdriver.Builder()
      .usingServer('http://hub-cloud.browserstack.com/wd/hub')
      .withCapabilities({
        ...capabilities,
        ...DEFAULT_CAPABILITIES,
      })
      .build();

    server.listen(PORT, done);
  });

  afterAll(async (done) => {
    await driver.quit();
    if (argv.ci !== true && bsLocal && bsLocal.isRunning()) {
      bsLocal.stop(() => {});
    }
    server.close(done);
  });

  it("test", async () => {
    await driver.get(`http://localhost:${PORT}`);
    const img = await driver.findElement(webdriver.By.css('img'))

    const return_value = await driver.executeScript('return Upscaler');
    expect(return_value).toEqual(2);
    console.log('done!')
  });
});
