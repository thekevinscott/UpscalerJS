const webdriver = require('selenium-webdriver');
const chai = require('chai');
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

CAPABILITIES.map(capabilities => ({
  ...capabilities,
  'browser_version' : 'latest',
  'browserstack.local': 'true',
  'build': process.env.BROWSERSTACK_BUILD_NAME,
  'project': process.env.BROWSERSTACK_PROJECT_NAME,
  'browserstack.localIdentifier': process.env.BROWSERSTACK_LOCAL_IDENTIFIER,
  'browserstack.user': process.env.BROWSERSTACK_USERNAME,
  'browserstack.key': process.env.BROWSERSTACK_ACCESS_KEY
})).forEach(async capabilities => {
  const driver = new webdriver.Builder()
    .usingServer('http://hub-cloud.browserstack.com/wd/hub')
    .withCapabilities(capabilities)
    .build()
    .get('http://localhost:8099');
  const title = await driver.getTitle();
  expect(title).to.equal('Some title');

  driver.quit();
});
