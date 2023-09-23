import {Args, Command, Flags} from '@oclif/core';
import path from 'path';
import { verbose } from '@internals/common/logger';
import { OutputFormat } from '@internals/common/types';
import { MODELS_DIR } from '@internals/common/constants';
import { rimraf } from 'rimraf';
import { validateOutputFormats } from '../../lib/commands/build/validate-build-options.js';
import asyncPool from "tiny-async-pool";
import { readFile, exists, mkdirp } from '@internals/common/fs';
import { replaceTscAliasPaths } from 'tsc-alias';
import { getPackageJSONExports } from '@internals/common/package-json';
import { uglify } from '../../lib/utils/uglify.js';
import { babelTransform } from '../../lib/utils/babel-transform.js';
import { inputOptions } from '../../lib/rollup-configs/models-rollup-config.js';
import { validateModels } from '../../lib/commands/validate-models.js';
import { rollupBuild } from '../../lib/utils/rollup.js';
import { compileTypescript } from '../../lib/utils/compile-typescript.js';
import { scaffoldModel } from '../scaffold/model.js';
import { collectVariadicArgs } from '../../lib/utils/collect-variadic-args.js';
import { BaseCommand } from '../base-command.js';
import { collectStringArgs } from '../../lib/utils/collect-string-args.js';

const CONCURRENT_ASYNC_THREADS = 5;

/****
 * ESM build function
 */
const buildESM = async (modelFolder: string) => {
  verbose(`Compiling ESM for ${modelFolder}`)
  await compileTypescript(modelFolder, 'esm');

  replaceTscAliasPaths({
    configFile: path.resolve(modelFolder, 'tsconfig.esm.json'),
  });
};

/****
 * UMD build function
 */
const getUMDNames = async (modelFolder: string): Promise<Record<string, string>> => {
  return JSON.parse(await readFile(path.resolve(modelFolder, 'umd-names.json')));
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

  indexDefinition = typeof indexDefinition !== 'string' ? indexDefinition.default : indexDefinition;

  if (!indexDefinition || typeof indexDefinition !== 'string') {
    throw new Error(`Bad index definition for ${modelFolder}, expected a string: ${JSON.stringify(indexDefinition, null, 2)}`)
  }

  return indexDefinition;
}

const getTypescriptFileOutputPath = async (modelFolder: string) => {
  const { exports } = JSON.parse(await readFile(path.resolve(modelFolder, 'package.json')));

  const indexDefinition = getIndexDefinition(exports, modelFolder).split('dist/esm/').pop();

  if (!indexDefinition) {
    throw new Error(`Could not parse exports from package.json for model folder ${modelFolder}}`);
  }

  return indexDefinition.split('/').slice(0, -1);
};

const buildUMD = async (modelFolder: string) => {
  const TMP = path.resolve(modelFolder, 'dist/tmp');
  const DIST = path.resolve(modelFolder, 'dist/umd');
  await mkdirp(DIST);

  verbose(`Compiling UMD for ${modelFolder}`)
  await compileTypescript(modelFolder, 'umd');
  replaceTscAliasPaths({
    configFile: path.resolve(modelFolder, 'tsconfig.umd.json'),
  });

  const files = await getPackageJSONExports(modelFolder);
  const umdNames = await getUMDNames(modelFolder);
  for (const [exportName] of files) {
    const umdName = umdNames[exportName];
    if (!umdName) {
      throw new Error(`No UMD name defined in ${modelFolder}/umd-names.json for ${exportName}`);
    }
    const filename = `${exportName === '.' ? 'index' : exportName}.js`;
    const FILE_DIST = path.resolve(DIST, path.dirname(filename));
    const input = path.resolve(TMP, ...(await getTypescriptFileOutputPath(modelFolder)), filename)

    if (!await exists(input)) {
      throw new Error(`The file ${input} does not exist; cannot call roll up`);
    }

    const file = path.basename(filename);

    await mkdirp(FILE_DIST);
    verbose(`Rollup building ${filename} for UMD in folder ${modelFolder}`);
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

    await uglify(FILE_DIST, file);
  }
  await rimraf(TMP);
};

/****
 * CJS build function
 */
const buildCJS = async (modelFolder: string) => {
  const DIST = path.resolve(modelFolder, 'dist/cjs');
  await mkdirp(DIST);
  verbose(`Compiling CJS for ${modelFolder}`);
  await compileTypescript(modelFolder, 'cjs');

  replaceTscAliasPaths({
    configFile: path.resolve(modelFolder, 'tsconfig.cjs.json'),
  });
  verbose(`Babel transforming for CJS for ${modelFolder}`);
  await babelTransform(DIST);
};

const OUTPUT_FORMAT_FNS = {
  umd: buildUMD,
  cjs: buildCJS,
  esm: buildESM,
}
const buildModel = async (modelPackageDirectoryName: string, outputFormats: OutputFormat[], { shouldClearDistFolder }: { shouldClearDistFolder?: boolean } = {}) => {
  await scaffoldModel(modelPackageDirectoryName);
  for (const outputFormat of outputFormats) {
    if (shouldClearDistFolder) {
      const distFolder = path.resolve(MODELS_DIR, modelPackageDirectoryName, 'dist', outputFormat);
      verbose(`Clearing dist folder ${distFolder}`);
      await rimraf(distFolder);
    }

    await OUTPUT_FORMAT_FNS[outputFormat](path.resolve(MODELS_DIR, modelPackageDirectoryName));
  }
}

export const buildModels = async (modelPackageDirectoryNames: string[], outputFormats: OutputFormat[], opts: { shouldClearDistFolder?: boolean } = {}) => {
  for await (const _ of asyncPool(
    CONCURRENT_ASYNC_THREADS,
    modelPackageDirectoryNames,
    (modelPackageDirectoryName: string) => buildModel(modelPackageDirectoryName, outputFormats, opts)
  )) { }
};

export default class BuildModel extends BaseCommand<typeof BuildModel> {
  static description = 'Build a model in upscalerjs'

  static flags = {
    outputFormats: Flags.string({char: 'o', multiple: true, description: 'What output format to build for. esm, cjs, or umd'}),
    validateModelsFolder: Flags.boolean({char: 'v', description: 'Whether to validate the existence of the models folder', default: false}),
  }

  static strict = false;

  static args = {
    models: Args.string({description: 'The model package to build. Must be a valid model in the /models folder', required: true}),
  }

  async run(): Promise<void> {
    const {flags} = await this.parse(BuildModel);
    const _models = collectStringArgs(this.argv);
    const models = await validateModels(_models, { validateModelsFolder: flags.validateModelsFolder, });
    const outputFormats = validateOutputFormats(flags.outputFormats);
    return buildModels(
      models,
      outputFormats,
    );
  }
}
