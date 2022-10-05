import path from 'path';
import browserstack from 'browserstack-local';
import fs from 'fs';
import webdriver, { Builder, logging } from 'selenium-webdriver';

export type Browserstack = browserstack.Local;
export interface BrowserOption {
  os?: string;
  os_version: string;
  browser?: string;
  browser_version?: string;
  device?: string;
  real_mobile?: 'true';
  browserName?: string;
  localhost?: string;
}

export const startBrowserstack = async (key?: string): Promise<Browserstack> => new Promise((resolve, reject) => {
  if (!key) {
    throw new Error('A key must be passed to start up the local browserstack service');
  }
  const bs = new browserstack.Local();
  bs.start({
    key,
    force: true,
    onlyAutomate: true,
    forceLocal: true,
  }, (error) => {
    if (error) {
      return reject(error);
    }
    if (bs.isRunning() !== true) {
      throw new Error('Browserstack failed to start');
    }
    resolve(bs);
  });
});

export const stopBrowserstack = (bs: Browserstack): Promise<void> => new Promise(resolve => bs.stop(() => resolve()));

const browserOptionsPath = path.resolve(__dirname, './browserStackOptions.json');

const browserOptions: Array<BrowserOption> = JSON.parse(fs.readFileSync(browserOptionsPath, 'utf8'));

export type FilterBrowserOption = (option: BrowserOption) => boolean;
export const getBrowserOptions = (filter?: FilterBrowserOption): Array<BrowserOption> => {
  if (!filter) {
    return browserOptions;
  }
  return browserOptions.filter(filter);
}

const prefs = new logging.Preferences();
prefs.setLevel(logging.Type.BROWSER, logging.Level.INFO);

type Capabilities = Parameters<Builder['withCapabilities']>[0];
export const getDriver = (serverURL: string, capabilities: Capabilities): webdriver.ThenableWebDriver => new webdriver.Builder()
  .usingServer(serverURL)
  .setLoggingPrefs(prefs)
  .withCapabilities(capabilities)
  .build();
