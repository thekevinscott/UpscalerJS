const webdriver = require('selenium-webdriver');
const expect = require('chai').expect;

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

describe("integration tests", () => {
  let driver;

  beforeAll(async () => {
    driver = getDriver(CAPABILITIES[0]);
  });

  afterAll(async () => {
    await driver.quit();
  });

  test("test", async () => {
    await driver.get('http://localhost:8099');
    const title = await driver.getTitle();
    expect(title).to.equal('Some title');
  });
});
