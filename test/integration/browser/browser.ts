import fs from 'fs';
import path from 'path';
import webdriver, { logging, Capabilities } from 'selenium-webdriver';
import browserstack from 'browserstack-local';
import { checkImage } from '../../lib/utils/checkImage';
import { bundle, DIST } from '../../lib/esm-esbuild/prepare';
import { startServer } from '../../lib/shared/server';
import { buildUpscalerJS } from '../../lib/utils/buildUpscalerJS';

const prefs = new logging.Preferences();
prefs.setLevel(logging.Type.BROWSER, logging.Level.INFO);

const caps = Capabilities.chrome();
caps.setLoggingPrefs(prefs);

const TRACK_TIME = false;
const PORT = 8099;
const DEFAULT_LOCALHOST = 'localhost';

const DEFAULT_CAPABILITIES = {
  'build': process.env.BROWSERSTACK_BUILD_NAME,
  'project': process.env.BROWSERSTACK_PROJECT_NAME,
  'browserstack.local': true,
  // 'browserstack.localIdentifier': process.env.BROWSERSTACK_LOCAL_IDENTIFIER,
}

const username = process.env.BROWSERSTACK_USERNAME;
const accessKey = process.env.BROWSERSTACK_ACCESS_KEY;
const serverURL = `http://${username}:${accessKey}@hub-cloud.browserstack.com/wd/hub`;

const JEST_TIMEOUT = 60 * 1000;
jest.setTimeout(JEST_TIMEOUT); // 60 seconds timeout
jest.retryTimes(3);


interface BrowserOption {
  os?: string;
  os_version: string;
  browser?: string;
  browser_version?: string;
  device?: string;
  real_mobile?: 'true';
  browserName?: string;
  localhost?: string;
}

const startBsLocal = (bsLocal) => new Promise(resolve => {
  bsLocal.start({
    'key': process.env.BROWSERSTACK_ACCESS_KEY,
    // 'localIdentifier': process.env.BROWSERSTACK_LOCAL_IDENTIFIER,
    'force': true,
    'onlyAutomate': 'true',
    'forceLocal': 'true',
  }, resolve);
});

const browserOptionsPath = path.resolve(__dirname, './config/browserOptions.json');

const browserOptions: Array<BrowserOption> = JSON.parse(fs.readFileSync(browserOptionsPath, 'utf8')).filter(option => {
  return !option.browserName.toLowerCase().includes('iphone');
})

describe('Browser Tests', () => {
  let server;
  let bsLocal;

  beforeAll(async function beforeAll(done) {
    const start = new Date().getTime();
    buildUpscalerJS('browser');
    const startBrowserStack = async () => {
      bsLocal = new browserstack.Local();
      await startBsLocal(bsLocal);
    };

    const startServerWrapper = async () => {
      await bundle();
      server = await startServer(PORT, DIST);
    };

    await Promise.all([
      startBrowserStack(),
      startServerWrapper(),
    ]);

    const end = new Date().getTime();
    if (TRACK_TIME) {
      console.log(`Completed pre-test scaffolding in ${Math.round((end - start) / 1000)} seconds`);
    }
    done();
  });

  afterAll(async function afterAll(done) {
    const start = new Date().getTime();
    const stopBrowserstack = () => new Promise(resolve => {
      if (bsLocal && bsLocal.isRunning()) {
        bsLocal.stop(resolve);
      }
    });

    const stopServer = () => new Promise((resolve) => {
      if (server) {
        server.close(resolve);
      } else {
        console.warn('No server found')
        resolve();
      }
    });
    await Promise.all([
      stopBrowserstack(),
      stopServer(),
    ]);
    const end = new Date().getTime();
    if (TRACK_TIME) {
      console.log(`Completed post-post-test clean up in ${Math.round((end - start) / 1000)} seconds`);
    }
    done();
  });

  describe.each(browserOptions)("Browser %j", (capabilities) => {
    let driver;

    beforeAll(async function beforeAll() {
      driver = new webdriver.Builder()
        .usingServer(serverURL)
        .withCapabilities({
          ...DEFAULT_CAPABILITIES,
          ...capabilities,
        })
        .build();
    });

    afterAll(function afterAll() {
      return driver.quit();
    });

    beforeEach(async function beforeEach() {
      const ROOT_URL = `http://${capabilities.localhost || DEFAULT_LOCALHOST}:${PORT}`;
      await driver.get(ROOT_URL);
      await driver.wait(() => driver.getTitle().then(title => title.endsWith('| Loaded'), 3000));
    });

    it("upscales an imported local image path", async () => {
      // const result1 = await driver.executeScript(() => {
      //   return 'foo';
      // });
      // expect(result1).toEqual('foo');
      // const result2 = await driver.executeScript(() => new Promise(resolve => resolve('bar')));
      // expect(result2).toEqual('bar');
      const result = await driver.executeScript(() => {
        // const log = msg => {
        //   const p = document.createElement('p');
        //   p.innerHTML = msg;
        //   p.style.fontSize = '80px';
        //   p.style.padding = '20px';
        //   p.style.wordWrap = 'break-word';
        //   document.body.appendChild(p);
        // }
        const data = window['upscaler'].upscale(window['flower']);
        document.body.querySelector('#output').innerHTML = `${document.title} | Complete`;
        return data;
      });
      driver.manage().logs().get(logging.Type.BROWSER)
     .then(function(entries) {
        entries.forEach(function(entry) {
          if (!entry.message.includes('favicon')) {
            console.log('LOG [%s] %s', entry.level.name, entry.message);
          }
        });
     });
      // console.log(result);
      checkImage(result, "upscaled-4x-pixelator.png", 'diff.png');
    });
  });
});
