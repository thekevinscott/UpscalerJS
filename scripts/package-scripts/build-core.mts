import fsExtra from 'fs-extra';
const { mkdirp } = fsExtra;
import {hideBin} from "yargs/helpers";
import * as url from 'url';
import { sync as rimraf } from 'rimraf';
import path from 'path';
import yargs from 'yargs';
import { OutputFormat as _OutputFormat } from './prompt/types.mjs';
import { compileTypescript } from './utils/compile.mjs';
import { getOutputFormats } from './prompt/getOutputFormats.mjs';
import { CORE_DIR } from './utils/constants.mjs';
import { ifDefined as _ifDefined} from './prompt/ifDefined.mjs';

/****
 * Types
 */
type BuildFnOptions = {
  clearDistFolder?: boolean;
}
type BuildFn = (opts?: BuildFnOptions) => Promise<void>;
type OutputFormat = Extract<_OutputFormat, 'cjs' | 'esm'>;

/****
 * Constants
 */
const DIST = path.resolve(CORE_DIR, 'dist');

/****
 * Utility functions
 */

const getDistFolder = (outputFormat: OutputFormat) => {
  return path.resolve(DIST, outputFormat);
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
  const distFolder = getDistFolder('esm');
  cleanOutput(distFolder, clearDistFolder);
  await compileTypescript(CORE_DIR, 'esm', {
    outDir: distFolder,
  });
};

/****
 * CJS build function
 */
const buildCJS: BuildFn = async (platform, {
  clearDistFolder = true,
} = {}) => {
  const distFolder = getDistFolder('cjs');
  cleanOutput(distFolder, clearDistFolder);
  await mkdirp(distFolder);
  await compileTypescript(CORE_DIR, 'cjs', {
    outDir: distFolder,
  });
};

/****
 * Main function
 */

const OUTPUT_FORMAT_FNS: Record<OutputFormat, BuildFn> = {
  cjs: buildCJS,
  esm: buildESM,
}

const buildCore = async (outputFormats: OutputFormat[], opts?: BuildFnOptions, { verbose = false } = {}): Promise<number> => {
  const start = performance.now();
  if (outputFormats.length === 0) {
    console.log('No output formats selected, nothing to do.')
    process.exit(0);
  }

  for (let i = 0; i < outputFormats.length; i++) {
    const outputFormat = outputFormats[i];
    await OUTPUT_FORMAT_FNS[outputFormat](opts);
  }
  return Number((performance.now() - start).toFixed(2));
};

export default buildCore;

/****
 * Functions to expose the main function as a CLI tool
 */

type Answers = { outputFormats: Array<OutputFormat>, verbose: boolean }

const getArgs = async (): Promise<Answers> => {
  const argv = await yargs(hideBin(process.argv))
  .command('build core', 'build core', yargs => {
    yargs.option('v', {
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

  const outputFormats = await getOutputFormats(argv.o);

  function ifDefined<T>(key: string, type: string) { return _ifDefined(argv, key, type) as T; }

  return {
    outputFormats,
    verbose: ifDefined('v', 'boolean'),
  }
}

const main = async () => {
  const args = await getArgs();
  await buildCore(args.outputFormats, undefined, { verbose: args.verbose });
}

if (import.meta.url.startsWith('file:')) { // (A)
  const modulePath = url.fileURLToPath(import.meta.url);
  if (process.argv[1] === modulePath) { // (B)
    (async () => {
      await main();
    })();
  }
}
