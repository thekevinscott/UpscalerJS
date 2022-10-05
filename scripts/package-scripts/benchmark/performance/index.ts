import yargs from 'yargs';
import path from 'path';
import inquirer from 'inquirer';
import callExec from '../../../../test/lib/utils/callExec';
import { getAllAvailableModelPackages } from '../../utils/getAllAvailableModels';
import { BenchmarkedResult, Benchmarker } from './utils/Benchmarker';
import { DatasetDefinition } from './utils/types';
import { ifDefined as _ifDefined } from '../../prompt/ifDefined';
import Table from 'cli-table';
import { QueryTypes, Sequelize } from 'sequelize';

/****
 * Constants
 */
const DEFAULT_METRICS = ['PSNR', 'SSIM'];
const ROOT_DIR = path.resolve(__dirname, '../../..');
const CACHE_DIR = path.resolve(ROOT_DIR, './tmp/datasets');
const DELAY = 1;
const PERFORMANCE_DATABASE_FILE = path.resolve(ROOT_DIR, 'docs/assets/performance.sql');
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: PERFORMANCE_DATABASE_FILE,
  logging: false,
});

/****
 * Types
 */

/****
 * Utility Functions & Classes
 */

const checkImagemagickInstallation = async (metrics: string[]) => {
  let data: string[] = [];
  try {
    await callExec('compare -list metric', {}, d => {
      data = data.concat(d.split('\n').filter(Boolean));
    }, false);
  } catch (err) {
    throw new Error('Imagemagick does not appear to be installed. Please install it for your system.');
  }
  const _data = data.map(d => d.toLowerCase())
  metrics.forEach(metric => {
    if (!_data.includes(metric.toLowerCase())) {
      throw new Error(`Imagemagick does not support ${metric} metrics. Supported metrics include: ${data}`);
    }
  });
}

const saveResults = async (results: BenchmarkedResult[]) => {
  if (results.length === 0) {
    throw new Error('No results found');
  }

  await Promise.all([
    `CREATE TABLE IF NOT EXISTS packages (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
  )`,
  `CREATE TABLE IF NOT EXISTS models (
    id INTEGER PRIMARY KEY,
    packageId INTEGER NOT NULL,
    name TEXT NOT NULL,
    scale INTEGER NOT NULL,
    meta JSON NOT NULL,
    UNIQUE(packageId, name)
  )`,
  `
  CREATE TABLE IF NOT EXISTS datasets (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
  )`,
  `CREATE TABLE IF NOT EXISTS metrics (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
  )`,
  `CREATE TABLE IF NOT EXISTS results (
    id INTEGER PRIMARY KEY,
    value REAL NOT NULL,
    datasetId INTEGER NOT NULL,
    modelId INTEGER NOT NULL,
    metricId INTEGER NOT NULL,
    UNIQUE(datasetid,modelId,metricId)
  )
  `].map(query => sequelize.query(query)));
  const { values } = results[0];
  for (const [datasetName, metrics] of Object.entries(values)) {
    await sequelize.query(`
      INSERT OR IGNORE INTO datasets (name) VALUES (:name)
    `, {
      replacements: {
        name: datasetName,
      },
      type: QueryTypes.INSERT,
    });
    for (const metric of Object.keys(metrics)) {
      await sequelize.query(`
        INSERT OR IGNORE INTO metrics (name) VALUES (:name)
      `, {
        replacements: {
          name: metric,
        },
        type: QueryTypes.INSERT,
      });
    }
  }

  for (const { packageName, modelName, meta, scale, values } of results) {
    await sequelize.query(`
      INSERT OR IGNORE INTO packages (name) VALUES (:name)
    `, {
      replacements: {
        name: packageName,
      },
      type: QueryTypes.INSERT,
    });
    await sequelize.query(`
      INSERT OR IGNORE INTO models 
      (name, scale, meta, packageId) 
      VALUES 
      (:name, :scale, :meta, (SELECT id FROM packages WHERE packages.name = :packageName))
      `, {
      replacements: {
        name: modelName,
        scale,
        meta: JSON.stringify(meta),
        packageName,
      },
      type: QueryTypes.INSERT,
    });

    for (const [datasetName, metrics] of Object.entries(values)) {
      for (const [metricName, value] of Object.entries(metrics)) {
        await sequelize.query(`
          INSERT OR IGNORE INTO results 
          (value, datasetId, modelId, metricId) 
          VALUES 
          (
            :value,
            (SELECT id FROM datasets WHERE datasets.name = :datasetName),
            (SELECT id FROM metrics WHERE metrics.name = :metricName),
            (SELECT id FROM models WHERE models.name = :modelName AND models.packageId = (SELECT id FROM packages WHERE packages.name = :packageName))
          )
          `, {
          replacements: {
            value,
            datasetName,
            metricName,
            modelName,
            packageName,
          },
          type: QueryTypes.INSERT,
        });

      }
    }
  }
}

const display = (results: BenchmarkedResult[]) => {
  if (results.length === 0) {
    throw new Error('No results found');
  }
  const { values } = results[0];
  const datasetNames = Object.keys(values);
  let metricNames: string[];
  const table = new Table({
    head: [
      'Package', 
      'Model', 
      'Scale', 
      ...datasetNames.reduce((arr, datasetName) => {
        if (!metricNames) {
          metricNames = Object.keys(values[datasetName]);
        }
        return arr.concat(metricNames.map(metric => [datasetName,metric.toUpperCase()].join('-')));
      }, [] as string[]),
    ],
  });

  results.forEach(result => {
    table.push([
      result.packageName, 
      result.modelName, 
      result.scale, 
      ...datasetNames.reduce((arr, datasetName) => {
        const metricValues = result.values[datasetName];
        return arr.concat(metricNames.map(metricName => metricValues[metricName]).map(val => val !== undefined ? val : '---'));
      }, [] as (number | string)[]),
    ]);
  });

  console.log(table.toString());
}

const mark = (msg: string) => {
  const divider = Array(98).fill('*').join('');
  console.log(`${divider}\n${msg}\n${divider}`);
}

/****
 * Main function
 */

const benchmarkPerformance = async (cacheDir: string, datasets: DatasetDefinition[], models: string[], metrics: string[], cropSize?: number, n?: number, resultsOnly?: boolean, useGPU = false) => {
  const benchmarker = new Benchmarker(cacheDir, metrics);
  if (resultsOnly !== true) {
    mark('Preparing');
  }
  if (datasets.length === 0) {
    let specifyDatabase = true;
    while (specifyDatabase) {
      specifyDatabase = await getArg<boolean>({
        message: `Would you like to specify a dataset?`,
        type: 'confirm',
      });

      if (specifyDatabase) {
        const datasetName = await getArg<string>({
          message: 'What is the name of the dataset',
          type: 'input',
        });
        const datasetPath = await getArg<string>({
          message: 'What is the path to the dataset',
          type: 'input',
        });
        await benchmarker.addDatasets([{ datasetName, datasetPath }], cropSize, resultsOnly, n);
      }
    }
  } else {
    await benchmarker.addDatasets(datasets, cropSize, resultsOnly, n);
  }
  const tf = useGPU ? require('@tensorflow/tfjs-node-gpu') : require('@tensorflow/tfjs-node');
  await benchmarker.addModels(tf, models, resultsOnly, useGPU);
  if (resultsOnly !== true) {
    mark('Evaluating');
    await benchmarker.benchmark(tf, cropSize, n, DELAY);
  }
  mark('Results');
  const results = await benchmarker.retrieveResults(metrics, cropSize);
  display(results);
  await saveResults(results);
};

/****
 * Functions to expose the main function as a CLI tool
 */
interface Args {
  cacheDir: string;
  // databaseFile: string;
  datasets: DatasetDefinition[];
  models: Array<string>;
  cropSize?: number;
  n?: number;
  resultsOnly?: boolean;
  metrics: string[];
  useGPU?: boolean;
}

async function getArg<T>(options: { message: string, type: string }) {
  const res = await inquirer.prompt<{
    arg: string
  }>([
    {
      name: 'arg',
      ...options,
    },
  ]);
  return res.arg as T;
};

const getDataset = async (..._datasets: unknown[]): Promise<DatasetDefinition[]> => {
  if (_datasets.length > 0) {
    const datasets = [];
    for (let i = 0; i < _datasets.length; i++) {
      const _dataset = _datasets[i];
      if (typeof _dataset !== 'string') {
        throw new Error(`Dataset provided was not a string: ${_dataset}.`);
      }
      const dataset = _dataset.split(':');
      if (dataset.length !== 2) {
        throw new Error(`You must specify a dataset as <dataset_name>:<dataset_path>. You specified ${dataset}`);
      }
      datasets.push({
        datasetName: dataset[0],
        datasetPath: dataset[1],
      });
    }
    return datasets;
  }

  return [];
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
  const argv = await yargs.command('benchmark-performance <dataset>', 'benchmark performance', yargs => {
    yargs.positional('dataset', {
      describe: 'The dataset',
    }).options({
      // databaseFile: { type: 'string' },
      cacheDir: { type: 'string' },
      model: { type: 'string' },
      cropSize: { type: 'number' },
      n: { type: 'number' },
      resultsOnly: { type: 'boolean' },
      useGPU: { type: 'boolean' },
      metric: { type: 'string' },
    });
  })
  .help()
  .argv;
  const metric = ifDefined<string>('metric', 'string');
  const metrics = metric ? [metric] : DEFAULT_METRICS;

  await checkImagemagickInstallation(metrics);

  const datasets = await getDataset(...argv._);
  const models = getModels(argv.model);

  function ifDefined<T>(key: string, type: string) { return _ifDefined(argv, key, type) as T; }

  return {
    models,
    datasets,
    cacheDir: ifDefined('cacheDir', 'string') || CACHE_DIR,
    cropSize: ifDefined('cropSize', 'number'),
    n: ifDefined('n', 'number'),
    resultsOnly: ifDefined('resultsOnly', 'boolean'),
    metrics,
    useGPU: ifDefined('useGPU', 'boolean'),
  }
}

if (require.main === module) {
  (async () => {
    const args = await getArgs();
    await benchmarkPerformance(args.cacheDir, args.datasets, args.models, args.metrics, args.cropSize, args.n, args.resultsOnly, args.useGPU);
  })();
}
