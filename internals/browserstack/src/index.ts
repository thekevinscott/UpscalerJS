import path from 'path';
import { Local } from 'browserstack-local';
import webdriver, { WebDriver, ThenableWebDriver, Builder, logging } from 'selenium-webdriver';
import * as dotenv from 'dotenv';
import { getCurrentBranch } from '@internals/git';
import { existsSync, readFileSync, writeFileSync } from 'fs-extra';
import puppeteer from 'puppeteer';
import { ROOT_DIR } from '../../../scripts/package-scripts/utils/constants';
import { createServerWithResponse } from '../../../test/lib/shared/server';

/****
 * Types
 */
export type Browserstack = Local;

export interface BrowserOption {
  os?: string;
  os_version: string;
  browser?: string;
  browser_version?: string;
  device?: string;
  real_mobile?: 'true';
  browserName?: string;
  localhost?: string;

  build?: string;
  name?: string;
  'browserstack.username'?: string;
  'browserstack.accessKey'?: string;
  'browserstack.local'?: string;
}

export type FilterBrowserOption = (option: BrowserOption) => boolean;

/****
 * Constants
 */

export const USE_PUPPETEER = true; // puppeteer doesn't work for mobile browsers
export const DEFAULT_LOCALHOST = 'localhost';
const env = getEnv();
const CURRENT_BRANCH =  getCurrentBranch();

const browserOptions: Array<BrowserOption> = JSON.parse(readFileSync(path.resolve(__dirname, './browserStackOptions.json'), 'utf8'));
const mobileBrowserOptions: Array<BrowserOption> = JSON.parse(readFileSync(path.resolve(__dirname, './browserStackMobileOptions.json'), 'utf8')).map((option: BrowserOption[]) => ({
  "real_mobile": "true",
  "localhost": "bs-local.com",
  ...option,
}));

const username = env.BROWSERSTACK_USERNAME;
const accessKey = env.BROWSERSTACK_ACCESS_KEY;

const prefs = new logging.Preferences();
prefs.setLevel(logging.Type.BROWSER, logging.Level.INFO);

/****
 * Public Constants
 */
export const serverURL = `http://${username}:${accessKey}@hub-cloud.browserstack.com/wd/hub`;
export const DEFAULT_CAPABILITIES = async () => ({
  // 'build': env.BROWSERSTACK_BUILD_NAME,
  // 'project': env.BROWSERSTACK_PROJECT_NAME,
  'browserstack.local': true,
  'build': await CURRENT_BRANCH,
  // 'browserstack.localIdentifier': process.env.BROWSERSTACK_LOCAL_IDENTIFIER,
})

/****
 * Utility Functions
 */
const waitForLocalhostAccess = async ({ verbose, }: { verbose?: boolean }) => {
  const TITLE = 'We are live';
  const PORT = 5003;
  await createServerWithResponse(PORT, TITLE);

  const caps = {
    'browser': 'chrome',
    // 'browser_version': 'latest',
    'os': 'os x',
    'os_version': 'catalina',
    'name': 'Testing localhost connectivity',
  };

  if (USE_PUPPETEER) {
    const browser = await connectPuppeteerForBrowserstack(caps);

    const page = await browser.newPage();
    await page.goto(getRootURL(PORT, caps));
    const title = await page.title();
    await browser.close();
    if (title !== TITLE) {
      throw new Error(`Expected title to be ${TITLE} but was: ${title}`);
    }
  } else {
    const driver = await getSeleniumDriver(caps, { verbose });
    await driver.get(getRootURL(PORT, caps));
    await driver.wait(async () => {
      const title = await driver.getTitle();
      return title.endsWith('| Loaded');
    }, 3000);

    await printLogs(driver, caps);
  }
};

function getEnv () {
  const localEnvPath = path.resolve(ROOT_DIR, '.env')
  if (existsSync(localEnvPath)) {
    return {
      ...process.env,
      ...dotenv.parse(readFileSync(localEnvPath, 'utf-8')),
    };
  }

  return process.env;
}

function shouldPrintLogs (entry: logging.Entry, capabilities: BrowserOption) {
  if (entry.message.includes('favicon')) {
    return false;
  }

  // if running in IE, it appears TFJS is already available? Ignore warnings
  // about the TFJS backend already being registered
  return entry.level.name !== 'WARNING' && capabilities?.browserName !== 'edge';
}


/****
 * Public Functions
 */
export const getBrowserstackAccessKey = () => getEnv().BROWSERSTACK_ACCESS_KEY;

export const stopBrowserstack = (bs: Browserstack): Promise<void> => new Promise(resolve => bs.stop(() => resolve()));

export const startBrowserstack = async ({
  key,
  bs,
  verbose = true,
}: {
  key?: string;
  bs?: Local;
  verbose?: boolean;
}): Promise<Browserstack> => new Promise(async (resolve, reject) => {
  if (!key) {
    throw new Error('A key must be passed to start up the local browserstack service');
  }
  if (!bs) {
    if (verbose) {
      console.log('Starting browserstack with a brand new object')
    }
    bs = new Local();
  } else {
    if (verbose) {
      console.log('Starting browserstack with an existing object')
    }
  }
  bs.start({
    key,
    force: true,
    onlyAutomate: true,
    forceLocal: true,
  }, async (error) => {
    if (error) {
      return reject(error);
    }
    if (bs?.isRunning() !== true) {
      throw new Error('Browserstack failed to start');
    }
    if (verbose) {
      console.log('Browserstack started, and running is:', bs.isRunning());
    }
    try {
      await waitForLocalhostAccess({
        verbose,
      });
    } catch (err) {
      await stopBrowserstack(bs);
      console.error('Could not access localhost via browserstack.')
      return reject(err);
    }
    resolve(bs);
  });
});

export const getBrowserOptions = (filter?: FilterBrowserOption): Array<BrowserOption> => browserOptions.filter(filter || Boolean);

export const getMobileBrowserOptions = (filter?: FilterBrowserOption): Array<BrowserOption> => mobileBrowserOptions.filter(filter || Boolean);

type Capabilities = Parameters<Builder['withCapabilities']>[0];
export const getSeleniumDriver = async (capabilities: Capabilities, { verbose }: { verbose?: boolean } = {}): Promise<ThenableWebDriver> => {
  const caps = {
    ...(await DEFAULT_CAPABILITIES()),
    ...capabilities,
    verbose,
  };
  console.log('caps', caps);
  const driver = new webdriver.Builder();
  driver.forBrowser('chrome');
  driver.usingServer(serverURL);
  driver.withCapabilities(caps);
  // driver.build();
  return driver.build();
  // return new webdriver.Builder()
  //   .usingServer(serverURL)
  //   .setLoggingPrefs(prefs)
  //   .withCapabilities(caps)
  //   .build();
};

export const printLogs = async (driver: WebDriver, capabilities: BrowserOption, verbose = false) => {
  if (capabilities?.browserName === 'firefox') {
    if (capabilities?.os === 'windows') {
      if (verbose) {
        console.log('Not printing logs, because it is Windows Firefox')
      }
      // There is a bug with Firefox not supporting the get logs method on Windows
      // https://stackoverflow.com/questions/59192232/selenium-trying-to-get-firefox-console-logs-results-in-webdrivererror-http-me
      // console.log('** Firefox on Windows does not support logging')
      return;
    }
    if (capabilities?.os === 'OS X') {
      if (verbose) {
        console.log('Not printing logs, because it is OS X Firefox')
      }
      // Firefox does not seem to support logging on OS X either
      // https://github.com/mozilla/geckodriver/issues/1698
      // console.log('** Firefox on OS X does not support logging')
      return;
    }
  }

  if (capabilities?.browserName === 'safari') {
    if (verbose) {
      console.log('Not printing logs, because it is Safari')
    }
    // It looks like Safari also does not support logging
    // console.log('** Safari does not support logging')
    return;
  }

  const logs = await driver.manage().logs().get(logging.Type.BROWSER);

  if (verbose) {
    console.log(`Got ${logs.length} logs`);
  }

  for (const entry of logs) {
    if (shouldPrintLogs(entry, capabilities)) {
      console.log('LOG [%s] %s', entry.level.name, entry.message, capabilities);
    } else if (verbose) {
      console.log('Skipping log');
    }
  }
}

export const takeScreenshot = async (driver: ThenableWebDriver, target: string) => new Promise<void>((resolve) => {
  driver.takeScreenshot().then(data => {
    var base64Data = data.replace(/^data:image\/png;base64,/, "");
    writeFileSync(target, base64Data, 'base64');
    resolve();
  });
});

type ExecuteAsyncScriptArgs = Parameters<webdriver.WebDriver['executeAsyncScript']>[1];
export async function executeAsyncScript<T>(driver: webdriver.WebDriver, fn: (args?: ExecuteAsyncScriptArgs) => T, args?: ExecuteAsyncScriptArgs, {
  pollTime = 100, 
  timeout = 60 * 1000 * 5,
}: {
  pollTime?: number;
  timeout?: number;
} = {}): Promise<T> {
  const wait = (d: number) => new Promise(r => setTimeout(r, d));
  const localKey = `___result_${Math.random()}___`;
  const errorKey = `___result_${Math.random()}___`;
  const mainFn = new Function(`
    const main = ${fn.toString()}
    main(...arguments).then((result) => {
      window['${localKey}'] = result;
    }).catch(err => {
      window['${errorKey}'] = err.message;
    });
  `);
  try {
    driver.executeScript(mainFn, args);
  } catch (err) {
    if (err instanceof Error) {
      throw new Error(`Error executing main script: ${err.message}`);
    } else {
      throw err;
    }
  }
  let response: T | undefined;
  let err: string | undefined;
  const start = performance.now();
  while (!response && !err) {
    if (performance.now() - start > timeout) {
      throw new Error(`Failed to execute script after ${timeout} ms`);
    }
    try {
      response = await driver.executeScript<T | undefined>((localKey: string) => window[localKey], localKey);
    } catch(err) {
      console.error(`Error executing script (duration: ${performance.now() - start})`, err);
    }
    if (!response) {
      err = await driver.executeScript<string | undefined>((errorKey: string) => window[errorKey], errorKey);
      if (err) {
        console.log('An error was returned', err);
        throw new Error(err);
      }
    }
    await wait(pollTime);
  }
  if (!response) {
    throw new Error('Bug with code');
  }
  return response;
};

export const getRootURL = (port: number, capabilities: BrowserOption) => `http://${capabilities.localhost || DEFAULT_LOCALHOST}:${port}`;

export const connectPuppeteerForBrowserstack = async (caps: BrowserOption) => puppeteer.connect({
  browserWSEndpoint: `wss://cdp.browserstack.com/puppeteer?caps=${encodeURIComponent(JSON.stringify({
    'build': await CURRENT_BRANCH,
    'browserstack.username': username,
    // process.env.BROWSERSTACK_USERNAME || 'kevinscott3',
    'browserstack.accessKey': accessKey,
    // process.env.BROWSERSTACK_ACCESS_KEY || 'TiWVBe57ZkZwqmuqHAVL',
    'browserstack.local': 'true',
    ...caps,
  }))}`,
});

// When checking for the errorKey or localKey variables on the window object above,
// we need to declare that window can adopt any kind of variable
declare global {
  interface Window {
    [index: string]: any; // skipcq: js-0323
  }
}
