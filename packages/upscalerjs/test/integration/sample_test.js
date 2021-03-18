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
describe('sample', () => {
  let driver;

  beforeAll(async () => {
    driver = new webdriver.Builder()
      .usingServer('http://kevinscott3:VqZ44zEoYmzqzdhFDrRM@hub-cloud.browserstack.com/wd/hub')
      .withCapabilities(capabilities)
      .build();
 
    await driver.get(
      'https://www.selenium.dev',
    );
  }, 60000);
 
  afterAll(async () => {
    await driver.quit();
  }, 60000);

  it('tests a sample', async () => {
    await driver.get(url)
    const title = await driver.findElement(by.tagName('h1')).getText()
    expect(title).toContain('SeleniumHQ Browser Automation')
  }, 60000);
});
