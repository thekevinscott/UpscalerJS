require('dotenv').config();
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const argv = yargs(hideBin(process.argv)).argv
const webdriver = require('selenium-webdriver');
const browserstack = require('browserstack-local');
const handler = require('serve-handler');
const http = require('http');
jest.setTimeout(30000);

const CAPABILITIES = [
{
  'os': 'windows',
  'os_version': '10',
  'browserName': 'chrome',
},
{
  'os': 'windows',
  'os_version': '10',
  'browserName': 'firefox',
}, 
{
  'os': 'windows',
  'os_version': '8.1',
  'browserName': 'chrome',
},
];

const getDriverForCapabilities = (capabilities) => {
  return new webdriver.Builder()
    .usingServer('http://hub-cloud.browserstack.com/wd/hub')
    .withCapabilities({
      'browser_version': 'latest',
      'browserstack.local': 'true',
      'build': process.env.BROWSERSTACK_BUILD_NAME,
      'project': process.env.BROWSERSTACK_PROJECT_NAME,
      'browserstack.localIdentifier': process.env.BROWSERSTACK_LOCAL_IDENTIFIER,
      'browserstack.user': process.env.BROWSERSTACK_USERNAME,
      'browserstack.key': process.env.BROWSERSTACK_ACCESS_KEY,
      ...capabilities,
    })
    .build();
};

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

  beforeAll(async () => {
    const server = http.createServer((request, response) => handler(request, response, {
      public: 'test/server',
    }));
    server.listen(8099);

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
  });

  afterAll(async () => {
    await driver.quit();
    if (argv.ci !== true && bsLocal && bsLocal.isRunning()) {
      bsLocal.stop(() => {});
    }
    server.stop();
  });

  it("test", async () => {
    await driver.get('http://localhost:8099');
    const title = await driver.getTitle();
    expect(title).toEqual('Some title');
  });
});
