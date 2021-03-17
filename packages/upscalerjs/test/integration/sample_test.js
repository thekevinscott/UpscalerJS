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
  it('tests a sample', async () => {
    let driver = new webdriver.Builder()
      .usingServer('http://kevinscott3:VqZ44zEoYmzqzdhFDrRM@hub-cloud.browserstack.com/wd/hub')
      .withCapabilities(capabilities)
      .build();
    await driver.get("http://www.google.com");
    const inputField = await driver.findElement(webdriver.By.name("q"));
    await inputField.sendKeys("BrowserStack", webdriver.Key.ENTER); // this submits on desktop browsers
    try {
      await driver.wait(webdriver.until.titleMatches(/BrowserStack/i), 5000);
    } catch (e) {
      await inputField.submit(); // this helps in mobile browsers
    }
    try {
      await driver.wait(webdriver.until.titleMatches(/BrowserStack/i), 5000);
      console.log(await driver.getTitle());
      await driver.executeScript(
        'browserstack_executor: {"action": "setSessionStatus", "arguments": {"status":"passed","reason": "Title contains BrowserStack!"}}'
      );
    } catch (e) {
      await driver.executeScript(
        'browserstack_executor: {"action": "setSessionStatus", "arguments": {"status":"failed","reason": "Page could not load in time"}}'
      );
    }
    await driver.quit();
  });
});
