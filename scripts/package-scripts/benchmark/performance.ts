import yargs from 'yargs';
import path from 'path';
import inquirer from 'inquirer';
import callExec from '../../../test/lib/utils/callExec';
import { getAllAvailableModelPackages } from '../utils/getAllAvailableModels';
import { Benchmarker } from './utils/Benchmarker';
import { DatasetDefinition } from './utils/types';
import { Image } from './utils/Image';

/****
 * Constants
 */
const ROOT_DIR = path.resolve(__dirname, '../../..');
const CACHE_DIR = path.resolve(ROOT_DIR, './tmp/datasets');

/****
 * Types
 */

/****
 * Utility Functions & Classes
 */
const checkImagemagickInstallation = async () => {
  try {
    await callExec('convert -version', {}, false, false);
  } catch (err) {
    throw new Error('Imagemagick does not appear to be installed. Please install it for your system.');
  }
}

/****
 * Main function
 */

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

const mark = (msg: string) => {
  const divider = Array(98).fill('*').join('');
  console.log(`${divider}\n${msg}\n${divider}`);
}

const benchmarkPerformance = async (cacheDir: string, datasets: DatasetDefinition[], models: string[], cropSize?: number, n?: number, resultsOnly?: boolean, metric?: string) => {
  const benchmarker = new Benchmarker(cacheDir);
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
        await benchmarker.addDatasets([{ datasetName, datasetPath }], resultsOnly);
      }
    }
  } else {
    await benchmarker.addDatasets(datasets, resultsOnly);
  }
  if (resultsOnly !== true) {
    await benchmarker.prepareImages(cropSize);
  }
  await benchmarker.addModels(models, resultsOnly);
  if (resultsOnly !== true) {
    mark('Evaluating');
    await benchmarker.benchmark(cropSize, n);
  }
  mark('Results');
  await benchmarker.display(Image.getCropKey(cropSize), metric);
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
  metric?: string;
}

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
      metric: { type: 'string' },
    });
  })
  .help()
  .argv;

  const datasets = await getDataset(...argv._);
  const models = getModels(argv.model);

  function ifDefined<T>(key: string, type: string) { return typeof argv[key] === type ? argv[key] as T: undefined; }

  return {
    models,
    datasets,
    cacheDir: ifDefined('cacheDir', 'string') || CACHE_DIR,
    cropSize: ifDefined('cropSize', 'number'),
    n: ifDefined('n', 'number'),
    resultsOnly: ifDefined('resultsOnly', 'boolean'),
    metric: ifDefined('metric', 'string'),
  }
}

if (require.main === module) {
  (async () => {
    await checkImagemagickInstallation()
    const args = await getArgs();
    await benchmarkPerformance(args.cacheDir, args.datasets, args.models, args.cropSize, args.n, args.resultsOnly, args.metric);
  })();
}
