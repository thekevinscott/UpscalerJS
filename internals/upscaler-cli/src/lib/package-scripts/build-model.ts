import fs, { mkdirp, existsSync, } from 'fs-extra';
import { sync as rimraf } from 'rimraf';
import path from 'path';
import scaffoldDependencies from './scaffold-dependencies';
import { rollupBuild } from './utils/rollup';
import { uglify } from './utils/uglify';
import { mkdirpSync } from 'fs-extra';
import yargs from 'yargs';
import { getPackageJSONExports } from './utils/getPackageJSONExports';
import { inputOptions, } from '../../../../../models/rollup.config';
import scaffoldDependenciesConfig from '../../../../../models/scaffolder';
import { ifDefined as _ifDefined } from './prompt/ifDefined';
import { OutputFormat } from './prompt/types';
import { compileTypescript } from './utils/compile';
import { DEFAULT_OUTPUT_FORMATS, getOutputFormats } from './prompt/getOutputFormats';
import { AVAILABLE_MODELS, getModel } from './prompt/getModel';
import { babelTransform } from './utils/babelTransform';
import { MODELS_DIR } from './utils/constants';
import { replaceTscAliasPaths } from 'tsc-alias';
import asyncPool from "tiny-async-pool";

/***
 * Types
 */

interface Opts {
  verbose?: boolean;
  forceRebuild?: boolean;
  skipCheckModelsExist?: boolean;
}

/***
 * Constants
 */
const CONCURRENT_ASYNC_THREADS = 3;

/****
 * Utility functions
 */

const mkDistFolder = async (dist: string) => {
  await mkdirp(dist);
};

/****
 * ESM build function
 */
const buildESM = async (modelFolder: string, opts: Opts = {}) => {
  const DIST = path.resolve(modelFolder, 'dist/esm');
  if (opts.forceRebuild !== true && existsSync(DIST)) {
    if (opts.verbose) {
      console.log(`dist folder "${DIST}" already exists for esm, skipping.`)
    }
    return;
  }
  if (opts.forceRebuild === true) {
    // clear out dist folder
    rimraf(DIST);
  }
  if (opts.verbose) {
    console.log(`Compiling typescript for ESM in folder ${modelFolder}`)
  }
  await compileTypescript(modelFolder, 'esm');

  replaceTscAliasPaths({
    configFile: path.resolve(modelFolder, 'tsconfig.esm.json'),
  });
};

/****
 * UMD build function
 */
const getUMDNames = (modelFolder: string): Record<string, string> => {
  return JSON.parse(fs.readFileSync(path.resolve(modelFolder, 'umd-names.json'), 'utf8'));
}

const getIndexDefinition = (exports: Record<string, Record<string, string>>, modelFolder: string) => {
  if (!exports) {
    throw new Error(`No exports defined in package.json for ${modelFolder}`)
  }
  if (!exports['.']) {
    throw new Error(`No index export defined in package.json for ${modelFolder}. The exports were ${JSON.stringify(exports, null, 2)}`)
  }

  let indexDefinition = exports['.'].import || exports['.'].require || exports['.'];

  if (!indexDefinition) {
    throw new Error(`No index definition found in package.json for ${modelFolder}. Nothing defined for '.'. Exports: ${JSON.stringify(exports, null, 2)}`);
  }

  indexDefinition = indexDefinition.default || indexDefinition;

  if (!indexDefinition || typeof indexDefinition !== 'string') {
    throw new Error(`Bad index definition for ${modelFolder}, expected a string: ${JSON.stringify(indexDefinition, null, 2)}`)
  }

  return indexDefinition;
}

const getTypescriptFileOutputPath = (modelFolder: string) => {
  const { exports } = JSON.parse(fs.readFileSync(path.resolve(modelFolder, 'package.json'), 'utf8'));

  const indexDefinition = getIndexDefinition(exports, modelFolder).split('dist/esm/').pop();

  if (!indexDefinition) {
    throw new Error(`Could not parse exports from package.json for model folder ${modelFolder}}`);
  }

  return indexDefinition.split('/').slice(0, -1);
};

const buildUMD = async (modelFolder: string, opts: Opts = {}) => {
  const TMP = path.resolve(modelFolder, 'dist/tmp');
  const DIST = path.resolve(modelFolder, 'dist/umd');
  if (opts.forceRebuild !== true && existsSync(DIST)) {
    if (opts.verbose) {
      console.log(`dist folder "${DIST}" already exists for umd, skipping.`)
    }
    return;
  }
  if (opts.forceRebuild === true) {
    // clear out dist folder
    rimraf(DIST);
  }
  await mkDistFolder(DIST);

  if (opts.verbose) {
    console.log(`Compiling typescript for UMD in folder ${modelFolder}`)
  }
  await compileTypescript(modelFolder, 'umd');
  replaceTscAliasPaths({
    configFile: path.resolve(modelFolder, 'tsconfig.umd.json'),
  });

  const files = getPackageJSONExports(modelFolder);
  const umdNames = getUMDNames(modelFolder);
  for (const [exportName] of files) {
    const umdName = umdNames[exportName];
    if (!umdName) {
      throw new Error(`No UMD name defined in ${modelFolder}/umd-names.json for ${exportName}`);
    }
    const filename = `${exportName === '.' ? 'index' : exportName}.js`;
    const FILE_DIST = path.resolve(DIST, path.dirname(filename));
    const input = path.resolve(TMP, ...getTypescriptFileOutputPath(modelFolder), filename)

    if (!existsSync(input)) {
      throw new Error(`The file ${input} does not exist; cannot call roll up`);
    }

    const file = path.basename(filename);

    mkdirpSync(FILE_DIST);
    if (opts.verbose) {
      console.log(`Rollup building ${filename} for UMD in folder ${modelFolder}`);
    }
    await rollupBuild({
      ...inputOptions,
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
  }
  rimraf(TMP);
};

/****
 * CJS build function
 */
const buildCJS = async (modelFolder: string, opts: Opts = {}) => {
  const DIST = path.resolve(modelFolder, 'dist/cjs');
  if (opts.forceRebuild !== true && existsSync(DIST)) {
    if (opts.verbose) {
      console.log(`dist folder "${DIST}" already exists for cjs, skipping.`)
    }
    return;
  }
  if (opts.forceRebuild === true) {
    // clear out dist folder
    rimraf(DIST);
  }
  await mkDistFolder(DIST);
  if (opts.verbose) {
    console.log(`Compiling typescript for CJS for ${modelFolder}`);
  }
  await compileTypescript(modelFolder, 'cjs', { verbose: opts.verbose });

  replaceTscAliasPaths({
    configFile: path.resolve(modelFolder, 'tsconfig.cjs.json'),
  });
  if (opts.verbose) {
    console.log(`Babel transforming for CJS for ${modelFolder}`);
  }
  await babelTransform(DIST);
};

/****
 * Main function
 */

const buildModel = async (
  model: string, 
  outputFormats: Array<OutputFormat>,
  opts: Opts = {},
) => {
  const start = performance.now();
  const MODEL_ROOT = path.resolve(MODELS_DIR, model);
  if (opts.skipCheckModelsExist !== true) {
    const modelsFolder = path.resolve(MODELS_DIR, model, 'models');
    const modelFiles = fs.readdirSync(modelsFolder);
    if (modelFiles.length === 0) {
      throw new Error(`No model files found in folder ${modelsFolder}. Did you call dvc pull for ${model}?`);
    }
  }
  if (opts.verbose) {
    console.log(`Scaffolding dependencies for model ${model}`);
  }
  if (model !== 'default-model') {
    scaffoldDependencies(MODEL_ROOT, scaffoldDependenciesConfig);
  }

  // rimraf(DIST);
  // await mkDistFolder(DIST);

  const outputFormatFns = [
    outputFormats.includes('umd') ? () => buildUMD(MODEL_ROOT, opts) : undefined,
    outputFormats.includes('cjs') ? () => buildCJS(MODEL_ROOT, opts) : undefined,
    outputFormats.includes('esm') ? () => buildESM(MODEL_ROOT, opts) : undefined,
  ]

  for (const outputFormatFn of outputFormatFns) {
    if (outputFormatFn) {
      await outputFormatFn();
    }
  }

  return Number((performance.now() - start).toFixed(2));
}

export const buildModels = async (
  models: Array<string> = AVAILABLE_MODELS, 
  outputFormats: Array<OutputFormat> = DEFAULT_OUTPUT_FORMATS, 
  opts: Opts = {}
): Promise<number[]> => {
  if (models.length === 0) {
    throw new Error('No models selected, nothing to do.')
  }

  if (outputFormats.length === 0) {
    throw new Error('No output formats selected, nothing to do.')
  }

  const start = performance.now();

  const durations: number[] = [];
  for await (const duration of asyncPool(CONCURRENT_ASYNC_THREADS, models, (model: string) => buildModel(model, outputFormats, opts))) {
    durations.push(duration);
  }
  if (opts.verbose) {
    console.log(`Built models in ${performance.now() - start}`)
  }
  return durations;
}

export default buildModels;

/****
 * Functions to expose the main function as a CLI tool
 */

interface Answers { 
  models: Array<string>;
  outputFormats: Array<OutputFormat>;
  verbose?: boolean;
  skipCheckModelsExist?: boolean;
}

const getArgs = async (): Promise<Answers> => {
  const argv = await yargs.command('build models', 'build models', yargs => {
    yargs.positional('model', {
      describe: 'The model to build',
    }).option('o', {
      alias: 'outputFormat',
      type: 'string',
    }).option('a', {
      alias: 'all',
      type: 'boolean',
    }).option('v', {
      alias: 'verbose',
      type: 'boolean',
    }).option('s', {
      alias: 'skipCheckModelsExist',
      type: 'boolean',
    });
  })
    .help()
    .argv;

  const models = await getModel(argv._[0], argv.a);
  const outputFormats = await getOutputFormats(argv.o);

  function ifDefined<T>(key: string, type: string) { return _ifDefined(argv, key, type) as T; }

  return {
    models,
    outputFormats,
    verbose: ifDefined('v', 'boolean'),
    skipCheckModelsExist: ifDefined('skipCheckModelsExist', 'boolean'),
  }
}

if (require.main === module) {
  (async () => {
    const { models, outputFormats, verbose, skipCheckModelsExist } = await getArgs();
    await buildModels(models, outputFormats, {
      verbose,
      skipCheckModelsExist,
    });
  })();
}
