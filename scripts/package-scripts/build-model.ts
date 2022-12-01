import fs, { mkdirp, existsSync, chmod, exists } from 'fs-extra';
import rimraf from 'rimraf';
import path from 'path';
import scaffoldDependencies from './scaffold-dependencies';
import { rollupBuild } from './utils/rollup';
import { uglify } from './utils/uglify';
import { mkdirpSync } from 'fs-extra';
import yargs from 'yargs';
import { getPackageJSONExports } from './utils/getPackageJSONExports';
import { inputOptions, } from '../../models/rollup.config';
import scaffoldDependenciesConfig from '../../models/scaffolder';
import { ifDefined as _ifDefined } from './prompt/ifDefined';
import { OutputFormat } from './prompt/types';
import { compileTypescript } from './utils/compile';
import { DEFAULT_OUTPUT_FORMATS, getOutputFormats } from './prompt/getOutputFormats';
import { AVAILABLE_MODELS, getModel } from './prompt/getModel';
import { babelTransform } from './utils/babelTransform';
import { MODELS_DIR } from './utils/constants';

/***
 * Types
 */

interface Opts {
  verbose?: boolean;
  forceRebuild?: boolean;
}

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
  if (opts.verbose) {
    console.log('Compiling typescript for ESM')
  }
  await compileTypescript(modelFolder, 'esm');
};

/****
 * UMD build function
 */
const getUMDNames = (modelFolder: string): Record<string, string> => {
  return JSON.parse(fs.readFileSync(path.resolve(modelFolder, 'umd-names.json'), 'utf8'));
}

const buildUMD = async (modelFolder: string, opts: Opts = {}) => {
  const TMP = path.resolve(modelFolder, 'dist/tmp');
  const DIST = path.resolve(modelFolder, 'dist/umd');
  if (opts.forceRebuild !== true && existsSync(DIST)) {
    if (opts.verbose) {
      console.log(`dist folder "${DIST}" already exists for umd, skipping.`)
    }
    return;
  }
  await mkDistFolder(DIST);

  if (opts.verbose) {
    console.log('Compiling typescript for UMD')
  }
  await compileTypescript(modelFolder, 'umd');

  const files = getPackageJSONExports(modelFolder);
  const umdNames = getUMDNames(modelFolder);
  for (let i = 0; i < files.length; i++) {
    const exportName = files[i];
    const umdName = umdNames[exportName];
    if (!umdName) {
      throw new Error(`No UMD name defined in ${modelFolder}/umd-names.json for ${exportName}`);
    }
    const filename = `${exportName === '.' ? 'index' : exportName}.js`;
    const FILE_DIST = path.resolve(DIST, path.dirname(filename));
    const input = path.resolve(TMP, filename);

    if (!existsSync(input)) {
      throw new Error(`The file ${input} does not exist; cannot call roll up`);
    }

    const file = path.basename(filename);

    mkdirpSync(FILE_DIST);
    if (opts.verbose) {
      console.log(`Rollup building ${filename} for UMD`)
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
  rimraf.sync(TMP);
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
  await mkDistFolder(DIST);
  if (opts.verbose) {
    console.log('Compiling typescript for CJS');
  }
  await compileTypescript(modelFolder, 'cjs');
  if (opts.verbose) {
    console.log('Babel transforming for CJS');
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
  const DIST = path.resolve(MODEL_ROOT, 'dist')
  if (opts.verbose) {
    console.log('Scaffolding dependencies');
  }
  scaffoldDependencies(MODEL_ROOT, scaffoldDependenciesConfig);

  // rimraf.sync(DIST);
  // await mkDistFolder(DIST);

  const outputFormatFns = [
    outputFormats.includes('umd') ? () => buildUMD(MODEL_ROOT, opts) : undefined,
    outputFormats.includes('cjs') ? () => buildCJS(MODEL_ROOT, opts) : undefined,
    outputFormats.includes('esm') ? () => buildESM(MODEL_ROOT, opts) : undefined,
  ]

  for (let i = 0; i < outputFormatFns.length; i++) {
    const outputFormatFn = outputFormatFns[i];
    if (outputFormatFn) {
      await outputFormatFn();
    }
  }

  return performance.now() - start;
}

const buildModels = async (
  models: Array<string> = AVAILABLE_MODELS, 
  outputFormats: Array<OutputFormat> = DEFAULT_OUTPUT_FORMATS, 
  opts: Opts = {}
) => {
  if (models.length === 0) {
    console.log('No models selected, nothing to do.')
    return;
  }

  if (outputFormats.length === 0) {
    console.log('No output formats selected, nothing to do.')
    return;
  }

  const start = performance.now();
  const durations = await Promise.all(models.map(model => buildModel(model, outputFormats, opts)))
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
  }
}

if (require.main === module) {
  (async () => {
    const { models, outputFormats, verbose } = await getArgs();
    await buildModels(models, outputFormats, {
      verbose,
    });
  })();
}
