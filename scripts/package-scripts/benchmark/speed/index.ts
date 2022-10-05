import Upscaler from 'upscaler';
import fs from 'fs';
import path from 'path';
import webdriver, { Capabilities, logging } from 'selenium-webdriver';
import { checkImage } from '../../../../test/lib/utils/checkImage';
import { bundle, DIST, mockCDN as esbuildMockCDN } from '../../../../test/lib/esm-esbuild/prepare';
import * as tf from '@tensorflow/tfjs';
import { BrowserTestRunner } from '../../../../test/integration/utils/BrowserTestRunner';
import yargs from 'yargs';
import { startServer } from '../../../../test/lib/shared/server';
import http from 'http';
import { getAllAvailableModelPackages } from '../../utils/getAllAvailableModels';
import { getBrowserOptions, getDriver, printLogs, serverURL } from '../../utils/browserStack';

/****
 * Constants
 */
const PORT = 8099;
const DEFAULT_LOCALHOST = 'localhost';

// const DEFAULT_METRICS = ['PSNR', 'SSIM'];
const ROOT_DIR = path.resolve(__dirname, '../../..');
// const CACHE_DIR = path.resolve(ROOT_DIR, './tmp/datasets');
// const DELAY = 1;
// const PERFORMANCE_DATABASE_FILE = path.resolve(ROOT_DIR, 'docs/assets/performance.sql');
// const sequelize = new Sequelize({
//   dialect: 'sqlite',
//   storage: PERFORMANCE_DATABASE_FILE,
//   logging: false,
// });

const browserOptions = getBrowserOptions(option => {
  return option?.os === 'OS X';
});

/****
 * Types
 */

declare global {
  interface Window {
    Upscaler: typeof Upscaler;
    flower: string;
    tf: typeof tf;
  }
}

/****
 * Utility Functions & Classes
 */

const closeServer = (server: http.Server) => new Promise<void>((resolve, reject) => {
  try {
    server.close(err => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  } catch (err) {
    resolve();
  }
});

/****
 * Main function
 */

const benchmarkSpeed = async () => {
  await bundle();
  const server = await startServer(PORT, DIST);
  for (const capabilities of browserOptions.slice(0, 1)) {
    console.log(capabilities)
    const driver = getDriver(capabilities)
    const ROOT_URL = `http://${capabilities.localhost || DEFAULT_LOCALHOST}:${PORT}`;
    await driver.get(ROOT_URL);
    await driver.wait(async () => {
      const title = await driver.getTitle();
      return title.endsWith('| Loaded');
    }, 3000);
    const result = await driver.executeScript(() => {
      const upscaler = new window['Upscaler']({
        model: {
          path: '/pixelator/pixelator.json',
          scale: 4,
        },
      });
      const data = upscaler.upscale(window['flower']);
      document.body.querySelector('#output')!.innerHTML = `${document.title} | Complete`;
      return data;
    });
    printLogs(driver, capabilities);
    console.log(result);
    checkImage(result, "upscaled-4x-pixelator.png", 'diff.png');
  }
  await closeServer(server);
};

/****
 * Functions to expose the main function as a CLI tool
 */
interface Args {
  models: Array<string>;
}

const getModels = (model?: unknown): string[] => {
  if (typeof model === 'string') {
    return [model];
  }

  if (Array.isArray(model)) {
    return model;
  }

  return getAllAvailableModelPackages().filter(model => model !== 'pixel-upsampler');
}

const getArgs = async (): Promise<Args> => {
  const argv = await yargs.command('benchmark-speed', 'benchmark speed', yargs => {
    yargs
    // .positional('dataset', {
    //   describe: 'The dataset',
    // })
    .options({
      model: { type: 'string' },
    });
  })
  .help()
  .argv;

  const models = getModels(argv.model);

  return {
    models,
  }
}

if (require.main === module) {
  (async () => {
    const args = await getArgs();
    await benchmarkSpeed();
  })();
}
