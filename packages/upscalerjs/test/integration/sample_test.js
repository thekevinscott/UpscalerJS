const webdriver = require('selenium-webdriver');
// Input capabilities
const capabilities = {
 'os_version' : '10',
 'resolution' : '1920x1080',
 'browserName' : 'Chrome',
 'browser_version' : 'latest',
 'os' : 'Windows',
 'name': 'BStack-[NodeJS] Sample Test', // test name
 'build': 'BStack Build Number 1' // CI/CD job or build name
}

const username = process.env.BROWSERSTACK_USERNAME;
const accessKey = process.env.BROWSERSTACK_ACCESS_KEY;
describe('sample', () => {
  let driver;

  beforeAll(async () => {
    driver = new webdriver.Builder()
      .usingServer(`http://${username}:${accessKey}@hub-cloud.browserstack.com/wd/hub`)
      .withCapabilities(capabilities)
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
