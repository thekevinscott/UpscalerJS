import asyncPool from "tiny-async-pool";
import path from 'path';
import { Package } from "./Package";
import http from 'http';
import type * as tf from '@tensorflow/tfjs';
import { Device } from './Device';
import { CreationAttributes, QueryTypes } from "sequelize";
import { ProgressBar } from "../../../utils/ProgressBar";
import { BrowserOption, getBrowserstackAccessKey, getDriver, printLogs, startBrowserstack, stopBrowserstack, takeScreenshot } from "../../../utils/browserStack";
import type webdriver from 'selenium-webdriver';
import { Benchmarker } from "./Benchmarker";
import { UpscalerModel } from "./UpscalerModel";
import sequelize from "./sequelize";
import { executeAsyncScript } from "./utils";
import { Local } from "browserstack-local";
import { mkdirpSync } from "fs-extra";

const PORT = 8099;
const DEFAULT_LOCALHOST = 'localhost';
const SIZE = 64;
const ALLOWED_ATTEMPTS = 1;

interface DefinedModel {
  packageName: string;
  modelName: string;
}

interface Iteration {
  device: Device; 
  modelPackage: Package; 
  model: UpscalerModel;
}

export interface BenchmarkedSpeedResult {
  duration: number;
  times: number;
  size: number;

  experimental: boolean;
  packageName: string;
  modelName: string;
  scale: number;
  meta: Record<string, string | number>;

  deviceOs: string;
  deviceOsVersion: string;
  deviceBrowserName?: string;
  deviceBrowserVersion?: string;
  device?: string;
  deviceIsRealMobile?: boolean;
}

export class SpeedBenchmarker extends Benchmarker {
  modelPackages: Package[] = [];
  bsLocal?: Local;
  server?: http.Server;
  screenshotDir?: string;

  constructor(bsLocal?: Local, server?: http.Server, screenshotDir?: string) {
    super();
    this.bsLocal = bsLocal;
    this.server = server;
    this.screenshotDir = screenshotDir;
    if (screenshotDir) {
      mkdirpSync(screenshotDir);
    }
  }

  async initialize() {
    await this.database.initialize(async (sequelize) => {
    });
  }

  async addDevice(options: CreationAttributes<Device>) {
    return await this.database.addDevice(options);
  }

  devices: Device[] = [];
  async addDevices(browserOptions: BrowserOption[]) {
    for (const capabilities of browserOptions) {
      const device = await this.addDevice({
        os: capabilities.os,
        os_version: capabilities.os_version,
        browserName: capabilities.browserName,
        browser_version: capabilities.browser_version,
        device: capabilities.device,
        real_mobile: capabilities.real_mobile,
      });
      this.devices.push(device);
    }
    return this.devices;
  }

  async benchmark(packageNames: string[], times: number, modelNames?: string[]) {
    const iterations: Iteration[] = [];
    let firstSeen = false;
    for (const modelPackage of this.modelPackages) {
      if (packageNames.includes(modelPackage.name)) {
        const models = await modelPackage.getModels(modelNames);
        for (const model of models) {
          let toShow: undefined | [Device, number][] = undefined;
          // if (model.name === './8x' && modelPackage.name !== 'esrgan-thick') {
          if (model.name === './8x' || model.scale === 8) {
            console.log(`Skipping ${modelPackage.name}/${model.name}`);
            continue;
          }
          for (const device of this.devices) {
            const results = await sequelize.query<{ cnt: number }>(`
              SELECT COUNT(1) as cnt
              FROM SpeedMeasurements m 
              LEFT JOIN UpscalerModels um ON um.id = m.UpscalerModelId 
              LEFT JOIN Devices d ON d.id = m.DeviceId
              WHERE 1=1
              AND d.id = :DeviceId
              AND um.id = :UpscalerModelId
              GROUP BY um.id, d.id
              ;
          `, {
              type: QueryTypes.SELECT,
              replacements: Device.getCapabilitiesForQuery({
                DeviceId: device.id,
                UpscalerModelId: model.id,
              }),
            });
            if (results.length > 1) {
              throw new Error('Invalid results, should not be more than one')
            }

            const { cnt: measurementsLength = 0 } = results[0] || {};
            if (measurementsLength < times) {
              if (firstSeen === false) {
                firstSeen = true;
                console.log('Run speed benchmarking iterations for:');
              }
              if (toShow === undefined) {
                toShow = [];
              }
              const iterationsToAdd = times - measurementsLength;
              toShow.push([device, iterationsToAdd]);
              // console.log('Missing iterations for', model.name, measurementsLength, 'exist', 'need', times, 'adding', iterationsToAdd);
              for (let i = 0; i < iterationsToAdd; i++) {
                iterations.push({ device, modelPackage, model });
              }
            }
          }
          if (toShow !== undefined) {
            console.log('  -', modelPackage.name, model.name);
            const devicesByName = new Map<string, Set<{ iterationsToAdd: number, deviceName: string}>>();
            toShow.forEach(([device, iterationsToAdd]) => {
              const { browserName = ''} = device;
              const set = (devicesByName.get(browserName) || new Set());
              const deviceName = [device.device, device.os_version, device.browser_version].filter(Boolean).join(', ');
              set.add({ iterationsToAdd, deviceName });
              devicesByName.set(browserName, set);
            });
            devicesByName.forEach((values, key) => {
              console.log('    -', key);
              values.forEach(({iterationsToAdd, deviceName}) => {
                console.log('      -', iterationsToAdd, 'on', deviceName);
              });
            });
          }
        }
      }
    }
    // iterations.forEach(i => {
    //   console.log(i.modelPackage.name, i.model.name)
    // })
    const bar = new ProgressBar(iterations.length);
    const ATTEMPTS = 3;
    const setupAndGetDriver = async (capabilities: BrowserOption, attempts = 0): Promise<webdriver.ThenableWebDriver> => {
      if (!this.bsLocal) {
        throw new Error('No bs local was set');
      }
      if (attempts > ATTEMPTS) {
        throw new Error(`Could not get driver after ${ATTEMPTS} attempts`);
      }
      try {
        return await setupDriver(capabilities, this.screenshotDir);
      } catch(err) {
        if (this.bsLocal.isRunning()) {
          console.error('Could not set up device with capabilities, but bsLocal is running', capabilities, err);
          await stopBrowserstack(this.bsLocal);
        } else {
          console.error('Could not set up device with capabilities, and bsLocal is no longer running', capabilities, err);
        }
        const BROWSERSTACK_ACCESS_KEY = getBrowserstackAccessKey();
        console.log('attempt to start browser stack')
        await startBrowserstack({
          key: BROWSERSTACK_ACCESS_KEY, 
          bs: this.bsLocal,
        });
        console.log('started browserstack')
        return await setupAndGetDriver(capabilities, attempts + 1);
      }
    }
    const progress = async (i: number) => {
      const {
        device,
        modelPackage,
        model,
      } = iterations[i];
      const modelName = model.name === '.' ? 'index' : model.name.slice(2);
      if (!modelName) {
        throw new Error(`Invalid model name, original was ${model.name}`);
      }
      const capabilities = device.getCapabilities();
      const driver = await setupAndGetDriver(capabilities);
      try {
        if (driver) {
          const { upscaleDurations: durations } = await benchmarkDevice(driver, capabilities, { packageName: modelPackage.name, modelName }, times);
          bar.update();
          if (durations && Array.isArray(durations)) {
            // console.log('\nINSERT', durations.length, 'entries for', device.device, 'and', model.name, 'and', modelPackage.name)
            for (const duration of durations) {
              await sequelize.query(`
                INSERT INTO SpeedMeasurements
                (value, size, UpscalerModelId, DeviceId, createdAt, updatedAt)
                values
                (
                  :value,
                  :size,
                  :UpscalerModelId,
                  :DeviceId,
                  DateTime('now'),
                  DateTime('now')
                )
              `, {
                replacements: {
                  value: duration,
                  size: SIZE,
                  UpscalerModelId: model.id,
                  DeviceId: device.id,
                }
              })
              // await SpeedMeasurement.create({
              //   value: duration,
              //   size: SIZE,
              //   UpscalerModelId: model.id,
              //   DeviceId: device.id,
              // });
            }
          } else {
            console.error('Durations returned was not an array', durations, capabilities, modelPackage.name, modelName,);
          }
        }
      } catch (err) {
        console.error('Error benchmarking device!!!', capabilities, modelPackage.name, modelName, err);
      }
      try {
        if (driver) {
          driver.quit();
        }
      } catch (err) {
        console.log('Failed to close driver with', err)
      }
    }
    for await (const _ of asyncPool(1, Array(iterations.length).fill('').map((_, i) => i), progress)) { }
    bar.end();
  }

  async retrieveResults(providedModelNames?: string[]): Promise<BenchmarkedSpeedResult[]> {
    const packages = this.modelPackages;
    const devices = this.devices;

    const query = `
          SELECT
          AVG(m.value) as duration,
          COUNT(m.value) as times,
          m.size,

          d.os as deviceOS,
          d.os_version as deviceOSVersion,
          d.browserName as deviceBrowserName,
          d.browser_version as deviceBrowserVersion,
          d.device as device,
          d.real_mobile as deviceIsRealMobile,

          p.name as packageName,
          p.experimental,
          um.name as modelName,
          um.scale as scale,
          um.meta as meta

          FROM SpeedMeasurements m
          LEFT JOIN UpscalerModels um ON um.id = m.UpscalerModelId
          LEFT JOIN Packages p ON p.id = um.PackageId
          LEFT JOIN Devices d ON d.id = m.DeviceId

          WHERE 1=1
          AND p.name IN (:packageNames)
          AND um.name IN (:modelNames)
          AND d.id IN (:deviceIds)

          GROUP BY d.id, um.id, m.size
      `;
    let modelNames: string[] = [];
    for (const pkg of packages) {
      const models = await pkg.getModels(providedModelNames);
      modelNames = modelNames.concat(models.map(m => m.name));
    }
    const deviceIds = devices.map(d => d.id);
    const packageNames = packages.map(p => p.name);
    const results: BenchmarkedSpeedResult[] = await sequelize.query(query, {
      replacements: {
        deviceIds,
        packageNames,
        modelNames,
      },
      type: QueryTypes.SELECT,
    });

    return results;
  }
}

const setupDriver = async (capabilities: BrowserOption, screenshotDir?: string) => {
  const driver = getDriver(capabilities);
  const ROOT_URL = `http://${capabilities.localhost || DEFAULT_LOCALHOST}:${PORT}`;
  await driver.get(ROOT_URL);

  const title = await driver.getTitle();
  try {
    await driver.wait(async () => {
      const title = await driver.getTitle();
      return (title || '').endsWith('| Loaded');
    }, 3000);
  } catch (err) {
    const deviceName = [capabilities.browserName, capabilities.device, capabilities.os_version, capabilities.browser_version].filter(Boolean).join('-').split(' ').join('-').toLowerCase();
    if (screenshotDir) {
      await takeScreenshot(driver, path.resolve(screenshotDir, `${deviceName}.png`));
    }
    throw new Error(`Could not find title that ends with "| Loaded". Title found was ${title} for url ${ROOT_URL}`);
  }
  return driver;
}

const benchmarkDevice = async (driver: webdriver.WebDriver, capabilities: BrowserOption, modelDefinition: DefinedModel, times: number, attempts = 0, err?: unknown): Promise<BenchmarkModelReturn> => {
  if (attempts > ALLOWED_ATTEMPTS) {
    throw err;
    // throw new Error(`Tried to get duration ${ALLOWED_ATTEMPTS} times but was unsuccessful`);
  }
  try {
    return await benchmarkModel(driver, capabilities, modelDefinition, times);
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (!err.message.includes('Failed to link vertex and fragment shaders')) {
        console.error(`\n\nAn error from benchmark model, attempt ${attempts}, for capabilities ${JSON.stringify(capabilities)} for model ${modelDefinition.packageName}/${modelDefinition.modelName}:`, err,'\n');
      }
    } else {
      throw err;
    }

    await driver.navigate().refresh();
    return await benchmarkDevice(driver, capabilities, modelDefinition, times, attempts + 1, err);
  }
}

interface BenchmarkModelReturn {
 warmupDuration: number; upscaleDurations: number[]; times: number; 
}
type BenchmarkModel = (
  driver: webdriver.WebDriver, 
  capabilities: BrowserOption,
  modelDefinition: DefinedModel, 
  times: number,
  patchSize?: number
) => Promise<BenchmarkModelReturn>;
interface ExecuteScriptOpts {
  modelDefinition: DefinedModel;
  size: number;
  times: number;
  // patchSize?: number;
}
const benchmarkModel: BenchmarkModel = async (
  driver,
  capabilities,
  modelDefinition,
  times,
  // patchSize,
) => {
  const optionsForDriver: ExecuteScriptOpts = {
    times, 
    modelDefinition, 
    size: SIZE, 
    // patchSize,
  };

  // const start = performance.now();
  const result: BenchmarkModelReturn = await executeAsyncScript<BenchmarkModelReturn>(driver, async ({
    modelDefinition: {
      packageName,
      modelName,
    },
    size,
    times,
    // patchSize,
  }: ExecuteScriptOpts) => {
    const info = document.createElement('p');
    document.body.append(info);
    const log = (...msg: string[]) => {
      const span = document.createElement('span');
      span.innerHTML = `${msg.join(', ')} | `;
      info.appendChild(span);
    }
    console.log = log;
    try {
      log(`${new Date()}`);
      const tf = window['tf'];
      if (!packageName) {
        throw new Error('No package name provided')
      }
      if (!modelName) {
        throw new Error('No model name provided')
      }
      const timeIt = async (fn: () => Promise<any>) => {
        const start = performance.now();
        const result = await fn();
        return [performance.now() - start, result];
      };
      const upscaleDurations: number[] = [];
      log(`0: Loading model ${packageName} and ${modelName}`);
      const pkg = window[packageName];
      log('1: got package');
      let model = pkg[modelName];
      log('2: got model');
      if (!model) {
        throw new Error(`No model found for package name ${packageName} and model name ${modelName}`)
      }
      if (typeof model === 'function') {
        model = model(tf);
        log('3: ran model');
      }
      const upscalerOpts = {
        model: {
          ...model,
          _internals: undefined,
          meta: undefined,
          path: `/models/${packageName}/${model.path}`,
        }
      };
      log('4: created opts');
      const Upscaler = window['Upscaler'];
      console.log('5: got Upscaler reference');
      try {
        const upscaler = new Upscaler(upscalerOpts);
        console.log('6: got new upscaler')
        const input = tf.zeros([1, size, size, 3]) as tf.Tensor4D;
        log('7: made new tensor');
        const [warmupDuration, _] = await timeIt(() => upscaler.warmup({
          patchSize: size,
          padding: 0,
        }));
        log('8: warmed up model');
        for (let i = 0; i < times; i++) {
          log(`9: times: ${i}`);
          const [upscaleDuration, tensor] = await timeIt(() => upscaler.execute(input, {
            patchSize: size,
            output: 'tensor',
          }));
          log(`10: times: ${i} | upscaled: ${upscaleDuration}`);
          upscaleDurations.push(upscaleDuration);
          tensor.dispose();
          log(`11: times: ${i} | cleaned up`);
        }
        upscaler.dispose();
        log(`12: disposed upscaler`);
        input.dispose();
        log(`13: disposed input`);
        return { warmupDuration, upscaleDurations, times };
      } catch (err: unknown) {
        if (err instanceof Error) {
          log(`error: upscalerOpts: ${JSON.stringify(upscalerOpts)} Error: ${err.message} `);
          throw new Error(`upscalerOpts: ${JSON.stringify(upscalerOpts)} Error: ${err.message}`);
        } else {
          log(JSON.stringify(err));
          throw err;
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        log(`Error for ${packageName} and ${modelName}: ${err.message} `);
      } else {
        log(JSON.stringify(err));
        throw err;
      }
      throw err;
    }
  }, optionsForDriver, {
    pollTime: 500,
    timeout: 30000 * 2 * 2, // 120 seconds max
  });
  await printLogs(driver, capabilities);
  return result;
};

declare global {
  interface Window {
    [index: string]: any;
  }
}
