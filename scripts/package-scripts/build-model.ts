import fs, { mkdirp } from 'fs-extra';
import rimraf from 'rimraf';
import path from 'path';
import inquirer from 'inquirer';
import scaffoldDependencies from './scaffold-dependencies';
import { rollupBuild } from './utils/rollup';
import { uglify } from './utils/uglify';
import { mkdirpSync } from 'fs-extra';
import yargs from 'yargs';
import { getAllAvailableModelPackages } from './utils/getAllAvailableModels';
import { getPackageJSONExports } from './utils/getPackageJSONExports';
import rollupConfig from '../../models/rollup.config';
import scaffoldDependenciesConfig from '../../models/scaffolder';
import { OutputFormat } from './utils/types';
import { compileTypescript } from './utils/compile';
import { transformAsync} from '@babel/core';
import { getAllFilesRecursively } from './utils/getAllFilesRecursively';

/****
 * Constants
 */
const ROOT_DIR = path.resolve(__dirname, '../..');
const MODELS_DIR = path.resolve(ROOT_DIR, 'models');
const AVAILABLE_MODELS = getAllAvailableModelPackages();
const DEFAULT_OUTPUT_FORMATS: Array<OutputFormat> = ['cjs', 'esm', 'umd'];

/****
 * ESM build function
 */
const buildESM = (modelFolder: string) => compileTypescript(modelFolder, 'esm');

/****
 * UMD build function
 */
const getUMDNames = (modelFolder: string): Record<string, string> => {
  return JSON.parse(fs.readFileSync(path.resolve(modelFolder, 'umd-names.json'), 'utf8'));
}

const buildUMD = async (modelFolder: string) => {
  const TMP = path.resolve(modelFolder, 'dist/tmp');
  const DIST = path.resolve(modelFolder, 'dist/umd');
  await mkdirp(DIST);
  await compileTypescript(modelFolder, 'umd');

  const files = getPackageJSONExports(modelFolder);
  const umdNames = getUMDNames(modelFolder);
  await Promise.all(files.map(async exportName => {
    const umdName = umdNames[exportName];
    if (!umdName) {
      throw new Error(`No UMD name defined in ${modelFolder}/umd-names.json for ${exportName}`)
    }
    const filename = `${exportName === '.' ? 'index' : exportName}.js`;
    const FILE_DIST = path.resolve(DIST, path.dirname(filename));
    const input = path.resolve(TMP, filename);
    const file = path.basename(filename);

    mkdirpSync(FILE_DIST);
    await rollupBuild({
      ...rollupConfig,
      input,
    }, [{
      file,
      format: 'umd',
      name: umdName,
      globals: {
        '@tensorflow/tfjs': 'tf',
      }
    }], FILE_DIST);

    uglify(FILE_DIST, file);
  }));
  rimraf.sync(TMP);
};

/****
 * CJS build function
 */
const babelTransform = async (directory: string) => {
  const files = getAllFilesRecursively(directory, file => file.endsWith('.js'));

  await Promise.all(files.map(async filePath => {
    const contents = fs.readFileSync(filePath, 'utf-8');
    const transformedCode = await transformAsync(contents, {
      plugins: [
        "@babel/plugin-transform-modules-commonjs",
        "babel-plugin-add-module-exports",
      ],
    });
    fs.writeFileSync(filePath, transformedCode?.code || '');
  }));
};

const buildCJS = async (modelFolder: string) => {
  const dist = path.resolve(modelFolder, 'dist/cjs');
  await mkdirp(dist);

  await compileTypescript(modelFolder, 'cjs');

  await babelTransform(dist);
};

/****
 * Main function
 */

const buildModel = async (model: string, outputFormats: Array<OutputFormat>) => {
  const start = new Date().getTime();

  const MODEL_ROOT = path.resolve(MODELS_DIR, model);
  const DIST = path.resolve(MODEL_ROOT, 'dist')
  scaffoldDependencies(MODEL_ROOT, scaffoldDependenciesConfig);

  rimraf.sync(DIST);
  await mkdirp(DIST);
  if (outputFormats.includes('cjs')) {
    await buildCJS(MODEL_ROOT);
  }

  if (outputFormats.includes('esm')) {
    await buildESM(MODEL_ROOT);
  }

  if (outputFormats.includes('umd')) {
    await buildUMD(MODEL_ROOT);
  }

  const duration = new Date().getTime() - start;
  return duration;
}

const buildModels = async (models: Array<string> = AVAILABLE_MODELS, outputFormats: Array<OutputFormat> = DEFAULT_OUTPUT_FORMATS) => {
  return await Promise.all(models.map(model => buildModel(model, outputFormats)))
}

export default buildModels;

/****
 * Functions to expose the main function as a CLI tool
 */

type Answers = { models: Array<string>, outputFormats: Array<OutputFormat> }

const getModel = async (model?: string | number) => {
  if (typeof model == 'string') {
    return [model];
  }

  const { models } = await inquirer.prompt<Answers>([
    {
      type: 'checkbox',
      name: 'models',
      message: 'Which models do you want to build?',
      choices: AVAILABLE_MODELS,
    },
  ]);
  return models;
}


const isValidOutputFormat = (outputFormat: string): outputFormat is OutputFormat => {
  for (let i = 0; i < DEFAULT_OUTPUT_FORMATS.length; i++) {
    const f = DEFAULT_OUTPUT_FORMATS[i];
    if (f === outputFormat) {
      return true;
    }
  }
  return false;
}

const getOutputFormats = async (outputFormat?: unknown) => {
  if (typeof outputFormat === 'string' && isValidOutputFormat(outputFormat)) {
    return [outputFormat]
  }
  if (Array.isArray(outputFormat)) {
    return outputFormat;
  }
  const { outputFormats } = await inquirer.prompt<Answers>([
    {
      type: 'checkbox',
      name: 'outputFormats',
      message: 'Which output formats do you want to build?',
      choices: ['cjs', 'esm', 'umd'],
    },
  ]);
  return outputFormats;
}

const getArgs = async (): Promise<Answers> => {
  const argv = await yargs.command('build models', 'build models', yargs => {
    yargs.positional('model', {
      describe: 'The model to build',
    }).option('o', {
      alias: 'outputFormat',
      type: 'string',
    });
  })
    .help()
    .argv;

  const models = await getModel(argv._[0]);
  const outputFormats = await getOutputFormats(argv.o);

  if (models?.length === 0) {
    console.log('No models selected, nothing to do.')
    process.exit(0);
  }

  if (outputFormats?.length === 0) {
    console.log('No output formats selected, nothing to do.')
    process.exit(0);
  }

  return {
    models,
    outputFormats,
  }
}

if (require.main === module) {
  (async () => {
    const { models, outputFormats } = await getArgs();
    await buildModels(models, outputFormats);
  })();
}
