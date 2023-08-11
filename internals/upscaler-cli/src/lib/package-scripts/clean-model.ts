import { access, exists, existsSync, rm, rmdir, unlink } from 'fs-extra';
import path from 'path';
import yargs from 'yargs';
import { ifDefined as _ifDefined } from './prompt/ifDefined';
import { OutputFormat } from './prompt/types';
import { DEFAULT_OUTPUT_FORMATS, getOutputFormats } from './prompt/getOutputFormats';
import { AVAILABLE_MODELS, getModel } from './prompt/getModel';
import { MODELS_DIR } from './utils/constants';

/***
 * Types
 */

interface Opts {
  verbose?: boolean;
}

/****
 * Utility functions
 */
const removeFolder = async (folderPath: string) => {
  if (existsSync(folderPath)) {
    await rm(folderPath, { recursive: true });
  }
}

const cleanModel = async (
  model: string, 
  outputFormats: Array<OutputFormat>,
  opts: Opts = {},
) => {
  const start = performance.now();
  const MODEL_ROOT = path.resolve(MODELS_DIR, model);
  const DIST = path.resolve(MODEL_ROOT, 'dist')
  if (outputFormats.length === DEFAULT_OUTPUT_FORMATS.length) {
    // clean whole dist folder
    if (opts.verbose) {
      console.log('Removing entire dist folder');
    }
    await removeFolder(DIST);
  } else {
    await Promise.all(outputFormats.map(async outputFormat => {
      if (opts.verbose) {
        console.log(`Removing dist/${outputFormat} folder`);
      }
      const distFolder = path.resolve(DIST, outputFormat);
      await removeFolder(distFolder);
    }));
  }

  return performance.now() - start;
}

/****
 * Main function
 */

const cleanModels = async (
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
  const durations = await Promise.all(models.map(model => cleanModel(model, outputFormats, opts)))
  if (opts.verbose) {
    console.log(`Cleaned models in ${performance.now() - start}`)
  }
  return durations;
}

export default cleanModels;

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
  const outputFormats = await getOutputFormats(argv.o, true);

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
    await cleanModels(models, outputFormats, {
      verbose,
    });
  })();
}
