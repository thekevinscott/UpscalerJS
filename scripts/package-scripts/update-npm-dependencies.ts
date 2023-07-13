import { exec as _exec, ExecOptions } from 'child_process';
import path from 'path';
import glob from 'glob';
import { ROOT_DIR } from './utils/constants';
import { 
  DIRECTORIES, 
  updateMultiplePackages, 
  updateSinglePackage,
 } from './utils/packages';

/****
 * Types
 */
interface PNPMLSItem {
  name: string; version: string; path: string; private: boolean;
}

/****
 * Utility functions
 */
const getOutput = async (cmd: string, opts: ExecOptions = {}) => new Promise<string>((resolve, reject) => {
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

const globAsync = (pattern: string, {
  cwd = ROOT_DIR,
  ...options
}: glob.IOptions = {
}) => new Promise<string[]>((resolve, reject) => {
  glob(pattern, {
    cwd,
    ...options,
  }, (err, files) => {
    if (err) {
      reject(err);
    } else {
      resolve(files);
    }
  });
});

const getPNPMPackages = async (): Promise<PNPMLSItem[]> => JSON.parse(await getOutput('pnpm m ls --json --depth=-1'));

const getAllNonPNPMPackages = async () => {
  const packages = new Set((await getPNPMPackages()).map((pkg) => `${pkg.path.split(`${ROOT_DIR}/`).pop()}/package.json`));
  const files = await globAsync('**/package.json', {
    ignore: [
      'node_modules/**', 
      '**/node_modules/**', 
      '**/scratch/**',
    ],
  });
  const filteredFiles = files.filter(file => !packages.has(file) && file !== 'package.json');
  await Promise.all(filteredFiles.map(async file => {
    await getOutput('npm update', {
      cwd: path.resolve(ROOT_DIR, path.dirname(file)),
    });
  }))
}

/****
 * Main function
 */
const updateNPMDependencies = async () => {
  await getAllNonPNPMPackages();
};

export default updateNPMDependencies;

/****
 * Functions to expose the main function as a CLI tool
 */

interface Args {
}

const getArgs = async (): Promise<Args> => {
  // const argv = await yargs.command('update-dependency <dependency> <version>', 'update dependency', yargs => {
  //   yargs.positional('dependency', {
  //     describe: 'The dependency to update',
  //   }).positional('version', {
  //     describe: 'The version to update to',
  //   }).options({
  //     packages: { type: 'string' },
  //   });
  // })
  // .help()
  // .argv;

  return {
  }
}

if (require.main === module) {
  (async () => {
    const {} = await getArgs();
    await updateNPMDependencies();
  })();
}
