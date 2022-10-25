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
import { BrowserOption, getBrowserOptions, getBrowserstackAccessKey, getDriver, printLogs, serverURL, startBrowserstack as _startBrowserstack, stopBrowserstack } from '../../utils/browserStack';
import { ProgressBar } from '../../utils/ProgressBar';
import asyncPool from 'tiny-async-pool';
import { UpscalerOptions } from 'upscaler/dist/browser/esm/types';

/****
 * Constants
 */
const PORT = 8099;
const DEFAULT_LOCALHOST = 'localhost';
const TIMES = 10;
const SIZES = [
  // 8, 16,
  32, 
  64, 
  // 128, 160, 192, 
  // 256, 384, 
  // 512, 768, 1024
];

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

const setupDriver = async (capabilities: BrowserOption) => {
  const driver = getDriver(capabilities);
  const ROOT_URL = `http://${capabilities.localhost || DEFAULT_LOCALHOST}:${PORT}`;
  await driver.get(ROOT_URL);
  await driver.wait(async () => {
    const title = await driver.getTitle();
    return title.endsWith('| Loaded');
  }, 3000);
  return driver;
}

const startBrowserstack = async () => {
  const BROWSERSTACK_ACCESS_KEY = getBrowserstackAccessKey();
  const bsLocal = await _startBrowserstack(BROWSERSTACK_ACCESS_KEY);
  process.on('exit', async () => {
    if (bsLocal !== undefined && bsLocal.isRunning()) {
      await stopBrowserstack(bsLocal);
    }
  });
  return bsLocal;
}

const setupSpeedBenchmarking = async (fn: () => Promise<void>) => {
  await bundle();
  const bsLocal = await startBrowserstack();
  const server = await startServer(PORT, DIST);

  let err: unknown;
  try {
    await fn();
  } catch(error: unknown) {
    err = error;
  }

  if (bsLocal !== undefined) {
    await stopBrowserstack(bsLocal);
  }
  await closeServer(server);
  if (err !== undefined) {
    console.error(err);
    process.exit(1);
  }
};

/****
 * Main function
 */

type BenchmarkModel = (
  driver: webdriver.WebDriver, 
  upscalerOpts: UpscalerOptions, 
  size: number, 
  times: number,
  patchSize?: number
) => Promise<Record<string, any>>;
interface ExecuteScriptOpts {
  upscalerOpts: UpscalerOptions;
  size: number;
  times: number;
  patchSize?: number;
}
const benchmarkModel: BenchmarkModel = async (
  driver,
  upscalerOpts,
  size,
  times,
  patchSize,
) => driver.executeScript(async ({ 
  upscalerOpts, 
  size, 
  times,
  patchSize,
}: ExecuteScriptOpts) => {
  const tf = window['tf'];
  const Upscaler = window['Upscaler'];
  const upscaler = new Upscaler(upscalerOpts);
  const input = tf.zeros([1, size, size, 3]) as tf.Tensor4D;
  await new Promise(r => setTimeout(r, 1));
  await upscaler.warmup([{
    patchSize: patchSize || size,
    padding: 0,
  }]);
  let durations = 0;
  for (let i = 0; i < times; i++) {
    const start = performance.now();
    const tensor = await upscaler.upscale(input, {
      output: 'tensor',
      patchSize,
    });
    durations += performance.now() - start;
    tensor.dispose();
  }
  input.dispose();
  return { duration: durations / times };
}, { times, upscalerOpts, size, patchSize });

const benchmarkDevice = async (capabilities: BrowserOption, upscalerOpts: UpscalerOptions, sizes: number[], callback: () => void) => {
  const driver = await setupDriver(capabilities);
  // console.log(capabilities)
  const durationsMap = new Map<number, number[]>();
  const iterations = [];
  for (const _ of Array(TIMES)) {
    for (const size of sizes) {
      iterations.push(size);
    }
  }
  const progress = async (size: number) => {
    try {
      const { duration } = await benchmarkModel(driver, upscalerOpts, size, TIMES);
      durationsMap.set(size, (durationsMap.get(size) || []).concat(duration))
      await printLogs(driver, capabilities);
    } catch (err: unknown) {
      if (err instanceof Error && 'message' in err && err.message.includes('Failed to link vertex and fragment shaders')) {
      } else {
        console.error(err, err);
      }
    }
  }
  for await (const _ of asyncPool(7, iterations, progress)) {
    callback();
  }
  durationsMap.forEach((durations, size) => {
    const avgDuration = durations.filter(d => !Number.isNaN(d)).reduce((sum, d) => sum + d, 0);
    console.log('Average duration for size', size, '(averaged over 100 times)', avgDuration) ;
  });
  return driver;
}

const benchmarkSpeed = async () => setupSpeedBenchmarking(async () => {
  const pairs: { capabilities: BrowserOption; model: string }[] = [];
  for (const capabilities of browserOptions.slice(0, 1)) {
    for (const model of ['esrgan-slim']) {
      pairs.push({ capabilities, model });
    }
  }
  const bar = new ProgressBar(pairs.length * SIZES.length * TIMES);
  const progress = async (i: number) => {
    const { 
      capabilities, 
      // model,
     } = pairs[i];
    const upscalerOpts: UpscalerOptions = {
      model: {
      path: '/pixelator/pixelator.json',
      scale: 4,
      },
    };
    const driver = await benchmarkDevice(capabilities, upscalerOpts, SIZES, () => {
      bar.update();
    });
    try {
      driver.quit();
    } catch (err) {
      console.log('Failed to close driver with', err)
    }
  }
  for await (const _ of asyncPool(7, Array(pairs.length).fill('').map((_, i) => i), progress)) { }
  bar.end();
});

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
