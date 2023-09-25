import fsExtra from 'fs-extra';
const { mkdirp, mkdirpSync } = fsExtra;
import { sync as rimraf } from 'rimraf';
import path from 'path';
import scaffoldDependencies, { ScaffoldDependenciesConfig, writeTFJSDependency } from './scaffold-dependencies.js';
import { rollupBuild } from './utils/rollup.js';
import { uglify } from './utils/uglify.js';
import * as rollupConfig from './upscalerjs-rollup-config.js';
import { OutputFormat, Platform } from './prompt/types.js';
import { compileTypescript } from './utils/compile.js';
import { withTmpDir } from './utils/withTmpDir.js';
import { UPSCALER_DIR } from './utils/constants.js';
import { ifDefined as _ifDefined} from './prompt/ifDefined.js';

const { inputOptions, outputOptions, } = rollupConfig;

/****
 * Types
 */
type BuildFnOptions = {
  clearDistFolder?: boolean;
}
type BuildFn = (platform: Platform, opts?: BuildFnOptions) => Promise<void>;

/****
 * Constants
 */
const DIST = path.resolve(UPSCALER_DIR, 'dist');

/****
 * Utility functions
 */

const getDistFolder = (platform: Platform, outputFormat: OutputFormat) => {
  return path.resolve(DIST, platform, outputFormat);
};

const cleanOutput = (distFolder: string, clearDistFolder: boolean) => {
  if (clearDistFolder) {
    rimraf(distFolder);
  }
}

/****
 * ESM build function
 */
const buildESM: BuildFn = async (platform, {
  clearDistFolder = true,
} = {}) => {
  const distFolder = getDistFolder(platform, 'esm');
  cleanOutput(distFolder, clearDistFolder);
  await compileTypescript(UPSCALER_DIR, 'esm', {
    outDir: distFolder,
  });
};

/****
 * UMD build function
 */
const buildUMD: BuildFn = async (platform, {
  clearDistFolder = true,
} = {}) => {
  const distFolder = getDistFolder(platform, 'umd');
  cleanOutput(distFolder, clearDistFolder);
  await withTmpDir(async tmpDir => {
    await compileTypescript(UPSCALER_DIR, 'umd', {
      outDir: tmpDir,
    });

    const temporaryInputFile = path.resolve(tmpDir, 'umd.js');

    const filename = 'upscaler.js';
    const umdName = 'Upscaler';
    const outputFileName = path.resolve(distFolder, path.dirname(filename));
    const file = path.basename(filename);

    mkdirpSync(distFolder);

    await rollupBuild({
      ...inputOptions,
      input: temporaryInputFile,
    }, [{
      ...outputOptions,
      file,
      name: umdName,
    }], outputFileName);

    uglify(outputFileName, file);
  }, {
    rootDir: path.resolve(DIST, 'tmp'),
    removeTmpDir: true, // set this to false to debug tmp outputs
  });
};

/****
 * CJS build function
 */
const buildCJS: BuildFn = async (platform, {
  clearDistFolder = true,
} = {}) => {
  const distFolder = getDistFolder(platform, 'cjs');
  cleanOutput(distFolder, clearDistFolder);
  await mkdirp(distFolder);
  await compileTypescript(UPSCALER_DIR, 'cjs', {
    outDir: distFolder,
  });
};

/****
 * Main function
 */

const OUTPUT_FORMAT_FNS: Record<OutputFormat, BuildFn> = {
  umd: buildUMD,
  cjs: buildCJS,
  esm: buildESM,
}

const getDefaultOutputFormats = (platform: Platform): OutputFormat[] => {
  if (platform === 'browser') {
    return ['esm', 'umd'];
  }

  return ['cjs'];
};

export const scaffoldDependenciesForUpscaler = async (platform: Platform, { verbose }: { verbose?: boolean } = {}) => {
  // const { default: scaffoldConfig } = await loadScaffoldDependenciesConfig(path.resolve(UPSCALER_DIR, 'scaffolder.ts'));

  const scaffoldConfig: ScaffoldDependenciesConfig = {
    scaffoldPlatformFiles: true,
    files: [
      {
        name: 'dependencies',
        contents: [
          writeTFJSDependency,
          () => "export { default as DefaultUpscalerModel } from '@upscalerjs/default-model';",
        ],
      },
    ],
  };

  await scaffoldDependencies(UPSCALER_DIR, scaffoldConfig, platform, { verbose });
}

const buildUpscaler = async (platform: Platform, _outputFormats?: OutputFormat[], opts?: BuildFnOptions, { verbose = false } = {}): Promise<number> => {
  const start = performance.now();
  const outputFormats = _outputFormats || getDefaultOutputFormats(platform);
  if (outputFormats.length === 0) {
    throw new Error('No output formats selected, nothing to do.');
  }

  await scaffoldDependenciesForUpscaler(platform, { verbose });

  for (const outputFormat of outputFormats) {
    await OUTPUT_FORMAT_FNS[outputFormat](platform, opts);
  }
  return Number((performance.now() - start).toFixed(2));
};

export default buildUpscaler;

/****
 * Functions to expose the main function as a CLI tool
 */

/*
type Answers = { platform: Platform, outputFormats: Array<OutputFormat>, verbose: boolean }

const getArgs = async (): Promise<Answers> => {
  const argv = await yargs.command('build upscaler', 'build upscaler', yargs => {
    yargs.positional('platforms', {
      describe: 'The platforms to build for',
    }).option('v', {
      alias: 'verbose',
      default: false,
      type: 'boolean',
    }).option('o', {
      alias: 'outputFormat',
      type: 'string',
    });
  })
    .help()
    .argv;

  const platform = await getPlatform(argv._[0]);
  const outputFormats = await getOutputFormats(argv.o);

  function ifDefined<T>(key: string, type: string) { return _ifDefined(argv, key, type) as T; }

  return {
    platform,
    outputFormats,
    verbose: ifDefined('v', 'boolean'),
  }
}

  // (async () => {
  //   const args = await getArgs();
  //   await buildUpscaler(args.platform, args.outputFormats, undefined, { verbose: args.verbose });
  // })();

  */
