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

/****
 * Constants
 */
const PORT = 8099;
const DEFAULT_LOCALHOST = 'localhost';

const ROOT_DIR = path.resolve(__dirname, '../../..');
// const CACHE_DIR = path.resolve(ROOT_DIR, './tmp/datasets');
// const SPEED_DATABASE_FILE = path.resolve(ROOT_DIR, 'docs/assets/speed.sql');
// const sequelize = new Sequelize({
//   dialect: 'sqlite',
//   storage: SPEED_DATABASE_FILE,
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

const benchmarkModel = async (driver: webdriver.WebDriver, model: string, size: number, patchSize?: number): Promise<Record<string, any>> => driver.executeScript(({ model, size, patchSize }: { model: string, size: number, patchSize?: number }) => {
  const tf = window['tf'];
  const Upscaler = window['Upscaler'];
  const recordings: { time: number; label: string ;}[] = [];
  const upscaler = new Upscaler({
    model: {
      path: '/pixelator/pixelator.json',
      scale: 4,
    },
  });
  const input = tf.zeros([1, size, size, 3]) as tf.Tensor4D;
  function processAndDisposeOfTensor<T extends tf.Tensor>(
    tensor: T,
    processFn?: any,
  ): T {
    if (processFn) {
      const processedTensor = tf.tidy(() => processFn(tensor));
      if (!tensor.isDisposed) {
        tensor.dispose();
      }
      return processedTensor;
    }
    return tensor;
  }
  const isTensor = (input: unknown): input is tf.Tensor => input instanceof tf.Tensor;

  async function* predict(
    pixels: tf.Tensor,
    model: any,
    modelDefinition: any,
  ) {
    const scale = modelDefinition.scale;


    const pred = model.predict(pixels) as tf.Tensor4D;
    recordings.push({time: new Date().getTime(), label: 'post predict' });
    yield [pred,];
    recordings.push({time: new Date().getTime(), label: 'post yield predict' });
    const postprocessedTensor = processAndDisposeOfTensor(pred, modelDefinition.postprocess);
    recordings.push({time: new Date().getTime(), label: 'post postprocess' });

    // https://github.com/tensorflow/tfjs/issues/1125
    /* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
    const squeezedTensor = postprocessedTensor.squeeze() as tf.Tensor3D;
    recordings.push({time: new Date().getTime(), label: 'post squeeze' });
    postprocessedTensor.dispose();
    recordings.push({time: new Date().getTime(), label: 'post dipose of postprocessed' });
    return squeezedTensor;
  }

  async function* upscale(
    input: tf.Tensor,
    model: any,
    modelDefinition: any,
  ) {
    const parsedInput = input.clone();
    recordings.push({time: new Date().getTime(), label: 'post clone' });
    const startingPixels = parsedInput;
    yield startingPixels;
    recordings.push({time: new Date().getTime(), label: 'post yield' });

    const preprocessedPixels = processAndDisposeOfTensor(startingPixels, modelDefinition.preprocess);
    recordings.push({time: new Date().getTime(), label: 'post preprocess' });
    yield preprocessedPixels;
    recordings.push({time: new Date().getTime(), label: 'post yield' });

    const gen = predict(
      preprocessedPixels,
      model,
      modelDefinition,
    );
    recordings.push({time: new Date().getTime(), label: 'post get predict generator' });
    let result = await gen.next();
    recordings.push({time: new Date().getTime(), label: 'post yielded result from predict generator' });
    yield result.value;
    recordings.push({time: new Date().getTime(), label: 'post yield value from predict generator' });
    while (!result.done) {
      result = await gen.next();
      recordings.push({time: new Date().getTime(), label: 'post await next from predict generator' });
      if (Array.isArray(result.value)) {
        yield [...result.value, preprocessedPixels,];
      } else if (isTensor(result.value)) {
        yield [result.value, preprocessedPixels,];
      } else {
        yield preprocessedPixels;
      }
      recordings.push({time: new Date().getTime(), label: 'post yield from predict generator loop' });
    }
    preprocessedPixels.dispose();
    recordings.push({time: new Date().getTime(), label: 'post dispose' });
    const upscaledPixels: tf.Tensor3D = result.value;

    return upscaledPixels;
  }

  async function wrapGenerator<T = unknown, TReturn = any, TNext = unknown>(
    gen: Generator<T, TReturn, TNext> | AsyncGenerator<T, TReturn, TNext>,
    postNext?: any
  ): Promise<TReturn> {
    let result: undefined | IteratorResult<T, TReturn>;
    for (result = await gen.next(); !result.done; result = await gen.next()) {
      if (postNext) {
        await postNext(result.value);
      }
    }
    return result.value;
  }

  async function cancellableUpscale(
    input: tf.Tensor,
    model: any,
    modelDefinition: any,
  ) {
    await tf.nextFrame();
    recordings.push({time: new Date().getTime(), label: 'next frame' });
    const upscaledPixels = await wrapGenerator(upscale(
      input,
      model,
      modelDefinition,
    ), async () => {
      await tf.nextFrame();
      recordings.push({time: new Date().getTime(), label: 'next frame (tick)' });
    });
    recordings.push({time: new Date().getTime(), label: 'post generator upscaling' });
    await tf.nextFrame();
    recordings.push({time: new Date().getTime(), label: 'next frame' });
    return upscaledPixels;
  }




  return upscaler.warmup([{
    patchSize: patchSize || size,
    padding: 0,
  }]).then(() => {
    recordings.push({ time: new Date().getTime(), label: 'begin' });
    return upscaler.getModel().then(({ model, modelDefinition }) => {
      recordings.push({time: new Date().getTime(), label: 'fetch model' });
      const start = new Date().getTime();
      tf.tidy(() => model.predict(input) as tf.Tensor4D);
      const end = new Date().getTime();
      recordings.push({time: new Date().getTime(), label: 'raw predict' });
      return cancellableUpscale(input, model, modelDefinition).then(() => {
        return { duration: end - start, recordings };
      });
    });
    // return upscaler.warmup([{
    //   patchSize: patchSize || size,
    //   padding: 0,
    // }]).then(() => {
    // // tf.tidy(() => model.predict(input));
    // const end = new Date().getTime();
    // return { duration: end - start };
    // });

    // return upscaler.upscale(input, {
    //   output: 'tensor',
    //   patchSize,
    // }).then((tensor) => {
    //   // const shape = tensor.shape;
    //   const end = new Date().getTime();
    //   tensor.dispose();
    //   input.dispose();
    //   return {
    //     duration: end - start,
    //   };
    // });
  });
}, { model, size, patchSize });

const benchmarkDevice = async (capabilities: BrowserOption, model: string, sizes: number[], times: number, poolNum: number, callback: () => void) => {
  const driver = await setupDriver(capabilities);
  console.log(capabilities)
  const durations: any[] = [];
  const iterations = [];
  for (const _ of Array(times)) {
    for (const size of sizes) {
      iterations.push(size);
    }
  }
  const rests: any[] = [];
  const progress = async (size: number) => {
    try {
      const { duration, recordings, ...rest } = await benchmarkModel(driver, model, size);
      rests.push({
        ...rest,
        size,
      });
      durations.push({
        duration,
        size,
      });
      await printLogs(driver, capabilities);
      // console.log(`for a ${size}x${size} image`, `${duration}ms`, rest);
    } catch (err: unknown) {
      if (err instanceof Error && 'message' in err && err.message.includes('Failed to link vertex and fragment shaders')) {
        // console.log('Error with size being too large', size);
      } else {
        console.error(err, err);
      }
    }
  }
  for await (const _ of asyncPool(poolNum, iterations, progress)) {
    callback();
  }
  console.log(rests);
  rests.forEach(({ recordings, size }: { size: number; recordings: { time: number; label: string }[]}) => {
    if (recordings) {
      console.log('Size', size);
      recordings.slice(1).forEach(({ time, label }, i) => {
        const duration = time - recordings[i].time;
        console.log('*', duration, label);
      })
    } else {
      console.error('Error for size', size);
    }
  });
  // // console.log(durations.filter(({ duration }) => !Number.isNaN(duration)));
  // const { duration, size } = durations.filter(({ duration }) => duration !== undefined && !Number.isNaN(duration)).reduce((obj, { duration, size }) => ({
  //   duration: obj.duration + duration,
  //   size: obj.size + (size * size),
  // }), { duration: 0, size: 0});
  // const valuesBySize: Record<number, number[]> = durations.reduce((obj, { duration, size }) => {
  //   return {
  //     ...obj,
  //     [size]: (obj.size || []).concat(duration)
  //   };
  // }, {} as Record<number, number[]>);
  // for (const [size, values] of Object.entries(valuesBySize)) {
  //   console.log(size, values.reduce((sum, v) => sum + v, 0));

  // }
  // const avg = duration / size * 100;
  // console.log(duration, size, avg);
  // 164/(16*16)*100
  return driver;
}

const benchmarkSpeed = async () => setupSpeedBenchmarking(async () => {
  const pairs: { capabilities: BrowserOption; model: string }[] = [];
  const sizes = [8, 16, 32, 64, 128, 160, 192, 
    // 256, 384, 
    // 512, 768, 1024
  ];
  const times = 1;
  for (const capabilities of browserOptions.slice(0, 1)) {
    for (const model of ['esrgan-slim']) {
      pairs.push({ capabilities, model });
    }
  }
  const bar = new ProgressBar(pairs.length * sizes.length * times);
  const progress = async (i: number) => {
    const { capabilities, model } = pairs[i];
    const driver = await benchmarkDevice(capabilities, model, sizes, times, 3, () => {
      bar.update();
    });
    try {
      driver.quit();
    } catch (err) {
      console.log('Failed to close driver with', err)
    }
  }
  // so 9 active threads
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
