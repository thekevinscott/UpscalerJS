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
import { replaceTscAliasPaths } from 'tsc-alias';

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
  if (opts.forceRebuild === true) {
    // clear out dist folder
    rimraf.sync(DIST);
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

const getIndexDefinition = (exports: Record<string, any>, modelFolder: string) => {
  console.log(exports);
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
  console.log(indexDefinition);

  if (!indexDefinition) {
    throw new Error(`Could not parse exports from package.json for model folder ${modelFolder}}`);
  }

  return indexDefinition.split('/').slice(0, -1);
};

const buildUMD = async (modelFolder: string, opts: Opts = {}) => {
  const modelFolderName = modelFolder.split('/').pop() || '';
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
    rimraf.sync(DIST);
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
  for (let i = 0; i < files.length; i++) {
    const [exportName] = files[i];
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
  if (opts.forceRebuild === true) {
    // clear out dist folder
    rimraf.sync(DIST);
  }
  await mkDistFolder(DIST);
  if (opts.verbose) {
    console.log(`Compiling typescript for CJS for ${modelFolder}`);
  }
  await compileTypescript(modelFolder, 'cjs');
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
  const DIST = path.resolve(MODEL_ROOT, 'dist')
  if (opts.verbose) {
    console.log(`Scaffolding dependencies for model ${model}`);
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

  return Number((performance.now() - start).toFixed(2));
}

export const buildModels = async (
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
