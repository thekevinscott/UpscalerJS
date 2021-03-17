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

describe('executing test scenario on the website www.selenium.dev', () => {
  let driver;

  beforeAll(async () => {
    driver = new webdriver().build();
 
    await driver.get(
      'https://www.selenium.dev',
    );
  }, 10000);
 
  afterAll(async () => {
    await driver.quit();
  }, 15000);
  
  test('it performs a validation of title on the home page', async () => {
    await browser.get(url)
    const title = await browser.findElement(by.tagName('h1')).getText()
    expect(title).toContain('SeleniumHQ Browser Automation')
  })
 
  test('it performs a validation of the search box on the page', async () => {
    const foundAndLoadedCheck = async () => {
      await until.elementLocated(by.id('search'))
      const value = await browser.findElement(by.id('search')).getText()
      return value !== '~'
    }
 
    await browser.wait(foundAndLoadedCheck, 3000)
    const search = await browser.findElement(by.id('search')).getText()
    expect(search).toEqual('')
  });
})
