import {Args, Command, Flags} from '@oclif/core';
import path from 'path';
import { info, verbose, warn } from '@internals/common/logger';
import { OutputFormat, TFJSLibrary } from '@internals/common/types';
import { UPSCALER_DIR } from '@internals/common/constants';
import { rimraf } from 'rimraf';
import { uglify } from '../../lib/utils/uglify.js';
import * as rollupConfig from '../../lib/rollup-configs/upscalerjs-rollup-config.js';
import { mkdirp, readdir } from '@internals/common/fs';
import { validateOutputFormats, validateTFJSLibraries } from '../../lib/commands/build/validate-build-options.js';
import { buildCJS } from '../../lib/commands/build/build-cjs.js';
import { buildESM } from '../../lib/commands/build/build-esm.js';
import { withTmpDir } from '@internals/common/tmp-dir';
import { getOutputFormatsForEnvironment } from '../../lib/utils/get-output-formats-for-environment.js';
import { getEnvironmentFromTFJSLibrary } from '@internals/common/tfjs-library';
import { rollupBuild } from '../../lib/utils/rollup.js';
import { compileTypescript } from '../../lib/utils/compile-typescript.js';
import { scaffoldUpscaler } from '../scaffold/upscaler.js';
import { collectVariadicArgs } from '../../lib/utils/collect-variadic-args.js';
import { BaseCommand } from '../base-command.js';


const DIST = path.resolve(UPSCALER_DIR, 'dist');

const getDistFolder = (platform: TFJSLibrary, outputFormat: OutputFormat) => path.resolve(DIST, platform, outputFormat);

type BuildFn = (tfjsLibrary: TFJSLibrary) => Promise<void>;

/****
 * UMD build function
 */
const { inputOptions, outputOptions, } = rollupConfig;
const buildUMD: BuildFn = async (tfjsLibrary) => {
  const distFolder = getDistFolder(tfjsLibrary, 'umd');
  await withTmpDir(async tmpDir => {
    verbose('Compiling typescript for UMD');
    await compileTypescript(UPSCALER_DIR, 'umd', {
      outDir: tmpDir,
    });

    const temporaryInputFile = path.resolve(tmpDir, 'umd.js');

    const filename = 'upscaler.js';
    const umdName = 'Upscaler';
    const outputFileName = path.resolve(distFolder, path.dirname(filename));
    const file = path.basename(filename);

    mkdirp(distFolder);

    await rollupBuild({
      ...inputOptions,
      input: temporaryInputFile,
    }, [{
      ...outputOptions,
      file,
      name: umdName,
    }], outputFileName);

    await uglify(outputFileName, file);
    verbose('Compiled typescript for UMD');
  }, {
    rootDir: path.resolve(DIST, 'tmp'),
    removeTmpDir: true, // set this to false to debug tmp outputs
  });

  await cleanUpTmpIfEmpty();
};

const cleanUpTmpIfEmpty = async () => {
  const TMP_DIR = path.resolve(DIST, 'tmp');
  if ((await readdir(TMP_DIR)).length === 0) {
    await rimraf(TMP_DIR);
  } else {
    warn(`Not cleaning up tmp dir ${TMP_DIR} because it is not empty`);
  }
};

const OUTPUT_FORMAT_FNS: Record<OutputFormat, BuildFn> = {
  umd: buildUMD,
  cjs: (platform) => buildCJS(getDistFolder(platform, 'cjs'), UPSCALER_DIR),
  esm: (platform) => buildESM(getDistFolder(platform, 'esm'), UPSCALER_DIR),
}

interface TFJSLibraryAndOutputFormat {
  tfjsLibrary: TFJSLibrary;
  outputFormats?: OutputFormat[];
}

export const buildUpscaler = async (
  tfjsLibrariesAndOutputFormats: TFJSLibraryAndOutputFormat[], ) => {
  for (const { tfjsLibrary, outputFormats: _outputFormats } of tfjsLibrariesAndOutputFormats) {
    const outputFormats = _outputFormats || getOutputFormatsForEnvironment(getEnvironmentFromTFJSLibrary(tfjsLibrary));
    await scaffoldUpscaler(tfjsLibrary);
    for (const outputFormat of outputFormats) {
      if (outputFormat === 'cjs' && tfjsLibrary === 'browser') {
        throw new Error('Bad combo, debug why this is happening')
      }
      info(`Clearing dist folder ${path.resolve(DIST, tfjsLibrary, outputFormat)}`);
      await rimraf(path.resolve(DIST, tfjsLibrary, outputFormat));
      await OUTPUT_FORMAT_FNS[outputFormat](tfjsLibrary);
    }
  }
};

export default class BuildUpscaler extends BaseCommand<typeof BuildUpscaler> {
  static description = 'Build UpscalerJS'

  static flags = {
    outputFormats: Flags.string({char: 'o', description: 'What output format to build for. esm, cjs, or umd', multiple: true }),
    validateModelsFolder: Flags.boolean({char: 'v', description: 'Whether to validate the existence of the models folder', default: false}),
  }

  static strict = false;

  static args = {
    tfjsLibraries: Args.string({description: 'The model package to build. Must be a valid model in the /models folder', required: true}),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(BuildUpscaler);
    const outputFormats = validateOutputFormats(flags.outputFormats);
    const _tjfsLibraries = collectVariadicArgs(this.argv);
    return buildUpscaler(
      validateTFJSLibraries(_tjfsLibraries).map(tfjsLibrary => ({
        tfjsLibrary,
        outputFormats,
      })),
    );
  }
}
