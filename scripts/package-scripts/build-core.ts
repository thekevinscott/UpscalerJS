import { mkdirp } from 'fs-extra';
import rimraf from 'rimraf';
import path from 'path';
import scaffoldDependencies, { loadScaffoldDependenciesConfig } from './scaffold-dependencies';
import yargs from 'yargs';
import { OutputFormat as _OutputFormat } from './prompt/types';
import { compileTypescript } from './utils/compile';
import { getOutputFormats } from './prompt/getOutputFormats';
import { CORE_DIR } from './utils/constants';
import { ifDefined as _ifDefined} from './prompt/ifDefined';

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
    rimraf.sync(distFolder);
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
  const argv = await yargs.command('build upscaler', 'build upscaler', yargs => {
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

if (require.main === module) {
  (async () => {
    const args = await getArgs();
    await buildCore(args.outputFormats, undefined, { verbose: args.verbose });
  })();
}
