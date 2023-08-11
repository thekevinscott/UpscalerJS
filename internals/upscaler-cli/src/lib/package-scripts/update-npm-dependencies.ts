import { exec as _exec, ExecOptions } from 'child_process';
import yargs from 'yargs';
import path from 'path';
import { ifDefined as _ifDefined } from './prompt/ifDefined';
import { glob } from 'glob';
import { ROOT_DIR } from './utils/constants';
import asyncPool from "tiny-async-pool";

/****
 * Types
 */
interface PNPMLSItem {
  name: string;
  version: string;
  path: string;
  private: boolean;
}

/****
 * Constants
 */
const NUMBER_OF_CONCURRENT_THREADS = 5;

/****
 * Utility functions
 */
const exec = async (cmd: string, { verbose, ...opts }: { verbose?: boolean; } & ExecOptions = {}) => new Promise<string>((resolve, reject) => {
  let output = '';
  const spawnedProcess = _exec(cmd, opts, (error) => {
    if (error) {
      reject(error);
    } else {
      resolve(output);
    }
  });

  if (verbose) {
    spawnedProcess.stdout?.pipe(process.stdout);
  }
});
const getOutput = async (cmd: string, { ...opts }: ExecOptions = {}) => new Promise<string>((resolve, reject) => {
  let output = '';
  const spawnedProcess = _exec(cmd, opts, (error) => {
    if (error) {
      reject(error);
    } else {
      resolve(output);
    }
  });

  spawnedProcess.stdout?.on('data', chunk => {
    output += chunk;
  });
});

const getPNPMPackages = async (): Promise<PNPMLSItem[]> => JSON.parse(await getOutput('pnpm m ls --json --depth=-1'));

const getAllNonPNPMPackages = async () => {
  const packages = new Set((await getPNPMPackages()).map((pkg) => `${pkg.path.split(`${ROOT_DIR}/`).pop()}/package.json`));
  const files = await glob('**/package.json', {
    ignore: [
      'node_modules/**', 
      '**/node_modules/**', 
      '**/scratch/**',
      '**/dev/browser/public/**',
      '**/examples/react/**',
    ],
  });
  return files.filter(file => !packages.has(file) && file !== 'package.json');
}

/****
 * Main function
 */
const updateNPMDependencies = async ({ verbose }: Args) => {
  const filteredFiles = await getAllNonPNPMPackages();
  for await (const _ of asyncPool(NUMBER_OF_CONCURRENT_THREADS, filteredFiles, async (file: string) => {
    const output = await exec('npm update --save', {
      cwd: path.resolve(ROOT_DIR, path.dirname(file)),
      verbose,
    });
  })) { }
};

export default updateNPMDependencies;

/****
 * Functions to expose the main function as a CLI tool
 */

interface Args {
  verbose?: boolean;
}

const getArgs = async (): Promise<Args> => {
  const argv = await yargs.command('update-dependency <dependency> <version>', 'update dependency', yargs => {
    yargs.option('v', {
      alias: 'verbose',
      type: 'boolean',
      packages: { type: 'string' },
    });
  })
  .help()
  .argv;

  function ifDefined<T>(key: string, type: string) { return _ifDefined(argv, key, type) as T; }

  return {
    verbose: ifDefined('v', 'boolean'),
  }
}

if (require.main === module) {
  (async () => {
    const { verbose } = await getArgs();
    await updateNPMDependencies({ verbose });
  })();
}
