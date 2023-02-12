import { bundleEsbuild, ESBUILD_DIST } from '../../../../test/lib/esm-esbuild/prepare';
import type Upscaler from 'upscaler';
import * as tf from '@tensorflow/tfjs';
import path from 'path';
import { ifDefined as _ifDefined } from '../../prompt/ifDefined';
import yargs from 'yargs';
import { startServer } from '../../../../test/lib/shared/server';
import http from 'http';
import { getAllAvailableModelPackages } from '../../utils/getAllAvailableModels';
import { getBrowserstackAccessKey, getMobileBrowserOptions, serverURL, startBrowserstack as _startBrowserstack, stopBrowserstack } from '../../utils/browserStack';
import { BenchmarkedSpeedResult, SpeedBenchmarker } from '../performance/utils/SpeedBenchmarker';
import { TF } from "../performance/utils/types";
import Table from 'cli-table';
import { writeFileSync } from 'fs-extra';
import { Device } from '../performance/utils/Device';
import { Local } from 'browserstack-local';
import { QueryTypes, Sequelize } from 'sequelize';
import { ASSETS_DIR } from '../../utils/constants';
import { prebuild } from '../shared/prebuild';

/****
 * Constants
 */
const PORT = 8099;
const SHOW_DEVICES = false;
const ROOT_DIR = path.resolve(__dirname, '../../../..');
const SCREENSHOT_DIR = path.resolve(ROOT_DIR, './tmp/screenshots');
const SPEED_DATABASE_FILE = path.resolve(ASSETS_DIR, 'speed.sql');
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: SPEED_DATABASE_FILE,
  logging: false,
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

interface SetupSpeedBenchmarkingOpts {
  skipBundle?: boolean;
  skipInstallNodeModules?: boolean;
  verbose?: boolean;
  useNPM?: boolean;
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

const startBrowserstack = async () => {
  const BROWSERSTACK_ACCESS_KEY = getBrowserstackAccessKey();
  const bsLocal = await _startBrowserstack({ key: BROWSERSTACK_ACCESS_KEY });
  return bsLocal;
}

const setupSpeedBenchmarking = async (fn: (bsLocal?: Local, server?: http.Server) => Promise<void>, { useNPM, ...opts}: SetupSpeedBenchmarkingOpts, packages: string[], resultsOnly?: boolean) => {
  if (resultsOnly === true) {
    await fn();
  } else {
    if (opts.verbose) {
      console.log('Running prebuild');
    }
    await prebuild({
      packages,
      ...opts,
    });
    if (opts.verbose) {
      console.log('Completed prebuild');
    }
    if (opts.skipBundle !== true) {
      if (opts.verbose) {
        console.log('bundling')
      }
      await bundleEsbuild({
        ...opts,
        usePNPM: useNPM !== true,
      });
    }
    if (opts.verbose) {
      console.log('Starting local browserstack and local server');
    }
    const [bsLocal, server] = await Promise.all([
      startBrowserstack(),
      startServer(PORT, ESBUILD_DIST),
    ]);
    if (opts.verbose) {
      console.log('Successfully started local browserstack and local server')
    }

    const closeAll = async () => await Promise.all([
      bsLocal !== undefined && bsLocal.isRunning() ? stopBrowserstack(bsLocal) : () => { },
      closeServer(server),
    ])

    process.on('exit', closeAll);

    let err: unknown;
    try {
      await fn(bsLocal, server);
    } catch (error: unknown) {
      err = error;
    }

    if (opts.verbose) {
      console.log('Closing local browserstack and local server');
    }
    await closeAll();
    if (opts.verbose) {
      console.log('Successfully closed local browserstack and local server');
    }
    if (err !== undefined) {
      console.error(err);
      process.exit(1);
    }
  }
};

const mark = (msg: string) => {
  const divider = Array(98).fill('*').join('');
  console.log(`${divider}\n${msg}\n${divider}`);
}

const getDeviceName = (result: BenchmarkedSpeedResult) => {
  return [
    result.deviceOs,
    result.deviceOsVersion,
    result.deviceBrowserName,
    result.deviceBrowserVersion,
    result.device,
  ].filter(Boolean).join(', ');
}

const display = (results: BenchmarkedSpeedResult[]) => {
  if (results.length === 0) {
    throw new Error('No results found');
  }
  const head = [
    'Package',
    'Model',
    'Scale',
    'Device',
    'Speed',
    'Iterations',
    'Size',
  ];
  const table = new Table({
    head,
  });

  const rows: (string | number)[][] = results.sort((a, b) => {
    return a.duration - b.duration;
  }).map(result => {
    return [
      result.packageName,
      result.modelName,
      result.scale,
      getDeviceName(result),
      result.duration,
      result.times,
      result.size,
    ];
  });

  rows.forEach(row => {
    table.push(row);
  });

  console.log(table.toString());
}

const saveResults = async (results: BenchmarkedSpeedResult[]) => {
  if (results.length === 0) {
    throw new Error('No results found');
  }

  const queries = [
    ...[
      'packages',
      'models',
      'devices',
      'results',
    ].map(table => `DROP TABLE IF EXISTS ${table}`),
    `CREATE TABLE packages (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      experimental BOOL NOT NULL
    )`,
    `CREATE TABLE models (
      id INTEGER PRIMARY KEY,
      packageId INTEGER NOT NULL,
      name TEXT NOT NULL,
      scale INTEGER NOT NULL,
      meta JSON NOT NULL,
      UNIQUE(packageId, name)
    )`,
    `CREATE TABLE devices (
      id INTEGER PRIMARY KEY,
      os TEXT,
      os_version TEXT,
      browserName TEXT,
      browser_version TEXT,
      device TEXT,
      real_mobile TEXT
    )`,
    `CREATE TABLE results (
      id INTEGER PRIMARY KEY,
      value REAL NOT NULL,
      times REAL NOT NULL,
      size INTEGER NOT NULL,
      deviceId INTEGER NOT NULL,
      modelId INTEGER NOT NULL,
      UNIQUE(deviceId,modelId)
    )
  `];
  for (let i = 0; i < queries.length; i++) {
    const query = queries[i];
    await sequelize.query(query);
  }
  const packages = new Map<string, { packageName: string; experimental: boolean }>();
  const models = new Map<string, { packageName: string; modelName: string; scale: number; meta: Record<string, string | number>}>();
  const devices = new Map<string, {
    device?: string; deviceOs?: string; deviceOsVersion?: string; deviceBrowserName?: string; deviceBrowserVersion?: string; deviceIsRealMobile?: boolean;
  }>();
  for (const { packageName, modelName, scale, meta, device, deviceOs, deviceOsVersion, deviceBrowserName, deviceBrowserVersion, deviceIsRealMobile, experimental } of results) {
    packages.set(packageName, { packageName, experimental });
    models.set(`${packageName}-${modelName}`, {
      packageName,
      modelName,
      scale,
      meta,
    });
    devices.set([
      device, deviceOs, deviceOsVersion, deviceBrowserName, deviceBrowserVersion, deviceIsRealMobile
    ].join('-'), {
      device, deviceOs, deviceOsVersion, deviceBrowserName, deviceBrowserVersion, deviceIsRealMobile
    });
  }

  for (const [_, { packageName, experimental }] of packages) {
    await sequelize.query(`
      INSERT INTO packages (name, experimental) VALUES (:name, :experimental)
    `, {
      replacements: {
        name: packageName,
        experimental: experimental || 0,
      },
      type: QueryTypes.INSERT,
    });
  }
  for (const [_, { modelName, packageName, scale, meta }] of models) {
    await sequelize.query(`
      INSERT INTO models
      (name, scale, meta, packageId) 
        VALUES
        (
          :name, 
          :scale, 
          :meta, 
          (SELECT id FROM packages WHERE packages.name = :packageName)
        )
       `, {
    replacements: {
      name: modelName,
      scale,
      meta: JSON.stringify(meta),
      packageName,
    },
    type: QueryTypes.INSERT,
    });
  }
  for (const [_, {
    device, deviceOs, deviceOsVersion, deviceBrowserName, deviceBrowserVersion, deviceIsRealMobile
  }] of devices) {
    const replacements = Device.getCapabilitiesForQuery({
      os: deviceOs,
      os_version: deviceOsVersion,
      browserName: deviceBrowserName,
      browser_version: deviceBrowserVersion,
      device,
      real_mobile: deviceIsRealMobile,
    });
    replacements.real_mobile = replacements.real_mobile ? 'y' : 'n;'
    await sequelize.query(`
      INSERT INTO devices
      (
        os,
        os_version,
        browserName,
        browser_version,
        device,
        real_mobile
      )
      VALUES 
      (
        :os,
        :os_version,
        :browserName,
        :browser_version,
        :device,
        :real_mobile
      )
      `, {
        replacements,
        type: QueryTypes.INSERT,
    });
  }
  for (const { size, packageName, modelName, duration, times, device, deviceOs, deviceOsVersion, deviceBrowserName, deviceBrowserVersion, deviceIsRealMobile } of results) {
    await sequelize.query(`
      INSERT INTO results 
      (
        value,
        times,
        size,
        modelId,
        deviceId
      )
      VALUES 
      (
        :value,
        :times,
        :size,
        (
          SELECT id FROM models 
          WHERE 1=1
          AND models.name = :modelName 
          AND models.packageId = (
            SELECT id FROM packages 
            WHERE 1=1
            AND packages.name = :packageName
          )
        ),
        (
          SELECT id FROM devices d 
          WHERE 1=1 
          ${deviceOs ? 'AND d.os = :os' : ''}
          ${deviceOsVersion ? 'AND d.os_version = :os_version' : ''}
          ${deviceBrowserName ? 'AND d.browserName = :browserName' : ''}
          ${deviceBrowserVersion ? 'AND d.browser_version = :browser_version' : ''}
          ${device ? 'AND d.device = :device' : ''}
        )
      )
      `, {
          // ${deviceIsRealMobile ? 'AND d.real_mobile = :real_mobile' : ''}
      replacements: {
        value: duration,
        times,
        size,
        modelName,
        packageName,
        device, 
        os: deviceOs, 
        os_version: deviceOsVersion, 
        browserName: deviceBrowserName, 
        browser_version: deviceBrowserVersion, 
        // real_mobile: deviceIsRealMobile,
      },
      type: QueryTypes.INSERT,
    });
  }
}

const writeResultsToOutput = (results: BenchmarkedSpeedResult[], outputCSV: string) => {
  if (results.length === 0) {
    throw new Error('No results found');
  }

  const head = [
    'Package',
    'Model',
    'Scale',
    'Duration',
    'Iterations',
    'Size',
    'Device',
    'Device OS',
    'Device OS Version',
    'Device Browser Name',
    'Device Browser Version',
    'Device is Real Mobile',
  ];
  const table = new Table({
    head,
  });

  const rows: (string | number)[][] = results.sort((a, b) => {
    return a.duration - b.duration;
  }).map(result => {
    return [
      result.packageName,
      result.modelName,
      result.scale,
      result.duration,
      result.times,
      result.size,
      result.device || '---', 
      result.deviceOs || '---', 
      result.deviceOsVersion || '---', 
      result.deviceBrowserName || '---', 
      result.deviceBrowserVersion || '---', 
      result.deviceIsRealMobile ? 'yes' : 'no',
    ];
  });

  rows.forEach(row => {
    table.push(row);
  });

  writeFileSync(outputCSV, [
    head.join(','),
    ...rows.map(row => row.join(',')),
  ].join('\n'), 'utf-8');
}

/****
 * Main function
 */

const benchmarkSpeed = async (
  packages: string[], 
  {
  models,
  resultsOnly,
  outputCSV,
  times = 10,
  skipDisplayResults,
  device,
  ...opts
}: SetupSpeedBenchmarkingOpts & {
  device?: string;
  times?: number;
  models?: string[]
  outputCSV?: string;
  resultsOnly?: boolean;
  skipDisplayResults?: boolean;
  skipUpscalerBuild?: boolean;
  skipModelBuild?: boolean;
  forceModelRebuild?: boolean;
  verbose?: boolean;
}) => setupSpeedBenchmarking(async (bsLocal, server) => {
  const benchmarker = new SpeedBenchmarker(bsLocal, server, SCREENSHOT_DIR);
  await benchmarker.initialize();
  if (resultsOnly !== true) {
    mark('Preparing');
  }
  let tf: TF;
  await benchmarker.addModels(packages, models, resultsOnly, false, modelPackage => {
    if (!tf) {
      tf = require('@tensorflow/tfjs-node');
    }
    modelPackage.tf = tf;
  });
  const mobileOptions = getMobileBrowserOptions().filter(o => {
    if (device) {
      const itMatches = o.device?.toLowerCase().includes(device.toLowerCase());
      // console.log(`For device ${device}, is ${o.device} included? ${itMatches}`);
      return itMatches;
    }
    // return o.device === 'Samsung Galaxy S22 Ultra';
    return o.device !== "iPad Air 4";
  });

  if (SHOW_DEVICES) {
    console.log('Devices:');
    mobileOptions.forEach(d => {
      const device = [d.browserName, d.device, d.os_version, d.browser_version].filter(Boolean).join(', ');
      console.log(`  - ${device}`);
    });
  }

  await benchmarker.addDevices(mobileOptions);
  if (resultsOnly !== true) {
    mark('Evaluating');
    await benchmarker.benchmark(packages, times, models);
  }
  mark('Results');
  const results = await benchmarker.retrieveResults(models);
  if (skipDisplayResults !== true) {
    display(results);
  }
  await saveResults(results);
  if (outputCSV) {
    writeResultsToOutput(results, outputCSV);
  }
}, opts, packages, resultsOnly);

/****
 * Functions to expose the main function as a CLI tool
 */
interface Answers extends SetupSpeedBenchmarkingOpts {
  models?: Array<string>;
  packages: Array<string>;
  times?: number;
  resultsOnly?: boolean;
  outputCSV?: string;
  skipDisplayResults?: boolean;
  skipUpscalerBuild?: boolean;
  skipModelBuild?: boolean;
  forceModelRebuild?: boolean;
  verbose?: boolean;
  device?: string;
}

const getModels = (model?: unknown): undefined | string[] => {
  if (typeof model === 'string') {
    return [model];
  }

  if (Array.isArray(model)) {
    return model;
  }

  return undefined;
}

const getPackages = (pkg?: unknown): string[] => {
  if (typeof pkg === 'string') {
    return [pkg];
  }

  if (Array.isArray(pkg)) {
    return pkg;
  }

  return getAllAvailableModelPackages().filter(model => model !== 'pixel-upsampler');
};

const getArgs = async (): Promise<Answers> => {
  const argv = await yargs.command('benchmark-speed', 'benchmark speed', yargs => {
    yargs
    .options({
      model: { type: 'string' },
      package: { type: 'string' },
      device: { type: 'string' },
      times: { type: 'number' },
      resultsOnly: { type: 'boolean' },
      outputCSV: { type: 'string' },
      skipDisplayResults: { type: 'boolean' },
      skipBundle: { type: 'boolean' },
      skipInstallNodeModules: { type: 'boolean' },
      useNPM: { type: 'boolean' },
      skipUpscalerBuild: { type: 'boolean' },
      skipModelBuild: { type: 'boolean' },
      forceModelRebuild: { type: 'boolean' },
      verbose: { type: 'boolean' },
    });
  })
  .help()
  .argv;

  const packages = getPackages(argv.package);
  const models = getModels(argv.model);

  function ifDefined<T>(key: string, type: string) { return _ifDefined(argv, key, type) as T; }

  return {
    ...argv,
    packages,
    models,
    times: ifDefined('times', 'number'),
    resultsOnly: ifDefined('resultsOnly', 'boolean'),
    outputCSV: ifDefined('outputCSV', 'string'),
    skipDisplayResults: ifDefined('skipDisplayResults', 'boolean'),
    skipBundle: ifDefined('skipBundle', 'boolean'),
    skipInstallNodeModules: ifDefined('skipInstallNodeModules', 'boolean'),
    useNPM: ifDefined('useNPM', 'boolean'),
  }
}

if (require.main === module) {
  (async () => {
    const args = await getArgs();
    await benchmarkSpeed(args.packages, args);
  })();
}
