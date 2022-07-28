import fs, { mkdirp } from 'fs-extra';
import rimraf from 'rimraf';
import path from 'path';
import scaffoldDependencies, { loadScaffoldDependenciesConfig } from './scaffold-dependencies';
import { rollupBuild } from './utils/rollup';
import { uglify } from './utils/uglify';
import { mkdirpSync } from 'fs-extra';
import yargs from 'yargs';
import { getPackageJSONExports } from './utils/getPackageJSONExports';
import rollupConfig from '../../models/rollup.config';
import { OutputFormat, Platform } from './prompt/types';
import { compileTypescript } from './utils/compile';
import { getOutputFormats } from './prompt/getOutputFormats';
import { getPlatform } from './prompt/getPlatform';
import { babelTransform } from './utils/babelTransform';

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
const ROOT_DIR = path.resolve(__dirname, '../..');
const UPSCALER_DIR = path.resolve(ROOT_DIR, 'packages/upscalerjs');
const DIST = path.resolve(UPSCALER_DIR, 'dist');

/****
 * Utility functions
 */

const getDistFolder = (platform: Platform, outputFormat: OutputFormat) => {
  return path.resolve(DIST, platform, outputFormat);
}

/****
 * ESM build function
 */
const buildESM: BuildFn = async (platform, {
  clearDistFolder = true,
} = {}) => {
  const distFolder = getDistFolder(platform, 'esm');
  if (clearDistFolder) {
    rimraf.sync(distFolder);
  }
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
  const tmp = path.resolve(DIST, 'tmp')
  const distFolder = getDistFolder(platform, 'umd');
  if (clearDistFolder) {
    rimraf.sync(distFolder);
  }
  await compileTypescript(UPSCALER_DIR, 'umd', {
    outDir: tmp,
  });

  const filename = 'upscaler.js';
  const umdName = 'Upscaler';
  const fileDest = path.resolve(distFolder, path.dirname(filename));
  const input = path.resolve(tmp, filename);
  const file = path.basename(filename);

  mkdirpSync(distFolder);
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
  }], fileDest);

  uglify(fileDest, file);
  rimraf.sync(tmp);
};

/****
 * CJS build function
 */
const buildCJS: BuildFn = async (platform, {
  clearDistFolder = true,
} = {}) => {
  const distFolder = getDistFolder(platform, 'cjs');
  if (clearDistFolder) {
    rimraf.sync(distFolder);
  }
  await mkdirp(distFolder);
  await compileTypescript(UPSCALER_DIR, 'cjs', {
    outDir: distFolder,
  });
  await babelTransform(distFolder);
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

const buildUpscaler = async (platform: Platform, _outputFormats?: OutputFormat[], opts?: BuildFnOptions) => {
  const outputFormats = _outputFormats || getDefaultOutputFormats(platform);
  if (outputFormats.length === 0) {
    console.log('No output formats selected, nothing to do.')
    process.exit(0);
  }

  const { default: scaffoldConfig } = await loadScaffoldDependenciesConfig(path.resolve(UPSCALER_DIR, 'scaffolder.ts'));
  await scaffoldDependencies(UPSCALER_DIR, scaffoldConfig, platform);

  for (let i = 0; i < outputFormats.length; i++) {
    const outputFormat = outputFormats[i];
    await OUTPUT_FORMAT_FNS[outputFormat](platform, opts);
  }
};

export default buildUpscaler;

/****
 * Functions to expose the main function as a CLI tool
 */

type Answers = { platform: Platform, outputFormats: Array<OutputFormat> }

const getArgs = async (): Promise<Answers> => {
  const argv = await yargs.command('build upscaler', 'build upscaler', yargs => {
    yargs.positional('platforms', {
      describe: 'The platforms to build for',
    }).option('o', {
      alias: 'outputFormat',
      type: 'string',
    });
  })
    .help()
    .argv;

  const platform = await getPlatform(argv._[0]);
  const outputFormats = await getOutputFormats(argv.o);

  return {
    platform,
    outputFormats,
  }
}

if (require.main === module) {
  (async () => {
    const args = await getArgs();
    await buildUpscaler(args.platform, args.outputFormats);
  })();
}
