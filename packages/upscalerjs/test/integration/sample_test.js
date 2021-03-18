const webdriver = require('selenium-webdriver');

const DEFAULT_CAPABILITIES = {
 'name': 'BStack-[NodeJS] Sample Test', // test name
 'build': 'BStack Build Number 1' // CI/CD job or build name
}

const username = process.env.BROWSERSTACK_USERNAME;
const accessKey = process.env.BROWSERSTACK_ACCESS_KEY;
const server = `http://${username}:${accessKey}@hub-cloud.browserstack.com/wd/hub`

describe.each([
  {
    'os': 'windows',
    'os_version': '10',
    'browserName': 'firefox',
    'browser_version' : 'latest',
  },
  {
    'os': 'windows',
    'os_version': '10',
    'browserName': 'chrome',
    'browser_version' : 'latest',
  },
])("integration tests", (capabilities) => {
  let driver;

  beforeAll(async () => {
    driver = new webdriver.Builder()
      .usingServer(server)
      .withCapabilities({
        ...DEFAULT_CAPABILITIES,
        ...capabilities,
      })
      .build();
  }, 60000)

  afterAll(async () => {
    await driver.quit();
  }, 60000);

  it('tests a sample', async () => {
    await driver.get("http://www.google.com");
    const inputField = await driver.findElement(webdriver.By.name("q"));
    await inputField.sendKeys("BrowserStack", webdriver.Key.ENTER); // this submits on desktop browsers
    try {
      await driver.wait(webdriver.until.titleMatches(/BrowserStack/i), 5000);
    } catch (e) {
      await inputField.submit(); // this helps in mobile browsers
    }
    await driver.wait(webdriver.until.titleMatches(/BrowserStack/i), 5000);
    const title = await driver.getTitle();
    expect(title).toEqual('BrowserStack - Google Search');
  }, 120000);
});
