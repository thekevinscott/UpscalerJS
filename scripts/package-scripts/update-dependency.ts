import yargs from 'yargs';
import inquirer from 'inquirer';
import isValidVersion from './utils/isValidVersion';
import { 
  AVAILABLE_PACKAGES, 
  DIRECTORIES, 
  getPackageJSONPath, 
  getPackageJSONValue, 
  getPreparedFolderName, 
  Package, 
  TransformPackageJsonFn, 
  updateMultiplePackages, 
  updatePackageJSONForKey, 
  updateSinglePackage,
 } from './utils/packages';
import { Dependency } from '@schemastore/package';

/****
 * Utility functions
 */

class Logger {
  updates: Array<string> = [];
  constructor(msg: string) {
    this.push(msg);
  }

  push(msg: string) {
    this.updates.push(msg);
  }

  write() {
    if (this.updates.length) {
      this.updates.forEach(message => console.log(message))
    }
  }
}

const makeSetVersionForPackageJSON = (dependencies: string[], version: string): TransformPackageJsonFn => (packageJSON, dir) => {
  const packageJSONKeys = ['dependencies', 'peerDependencies', 'devDependencies', 'pnpm.overrides'];
  const logger = new Logger(`- Updated ${getPreparedFolderName(getPackageJSONPath(dir))}`);
  for (let i = 0; i < packageJSONKeys.length; i++) {
    const packageJSONKey = packageJSONKeys[i];
    const packageJSONListOfDependencies = getPackageJSONValue(packageJSON, packageJSONKey);
    if (packageJSONListOfDependencies) {
      const gen = getMatchingDependency(dependencies, packageJSONListOfDependencies);
      let value = gen.next().value;
      while (value) {
        const [key] = value;
        packageJSONListOfDependencies[key] = version;
        value = gen.next().value;
        logger.push(`  - ${packageJSONKey}: ${key}`);
      }
      packageJSON = updatePackageJSONForKey(packageJSON, packageJSONKey, packageJSONListOfDependencies)
    }
  }
  logger.write();
  return packageJSON;
}

export function* getMatchingDependency(matchingDependencies: string[], packageJSONListOfDependencies?: Dependency) {
  if (packageJSONListOfDependencies) {
    const entries = Object.entries(packageJSONListOfDependencies);
    for (let i = 0; i < entries.length; i++) {
      const [key, val] = entries[i];
      for (let j = 0; j < matchingDependencies.length; j++) {
        const matchingDependency = matchingDependencies[j];
        if (key === matchingDependency) {
          yield [key, val];
          break;
        }
      }
    }
  }
}

/****
 * Main function
 */
const updateDependency = async (dependencies: string[], version: string, packages: string[]) => {
  if (!isValidVersion(version)) {
    throw new Error(`Version is not in the format x.x.x. You specified: ${version}`);
  }
  if (packages.length === 0) {
    console.log('No packages selected, nothing to do.')
    return;
  }

  const setVersionForPackageJSON = makeSetVersionForPackageJSON(dependencies, version);

  await Promise.all(packages.map(packageKey => {
    const pkg = DIRECTORIES[packageKey];
    if (pkg === undefined) {
      throw new Error(`Package ${packageKey} is not defined.`);
    }
    const { multiple, directory } = pkg;
    const fn = multiple ? updateMultiplePackages : updateSinglePackage;
    return fn(directory, setVersionForPackageJSON);
  }));
};

export default updateDependency;

/****
 * Functions to expose the main function as a CLI tool
 */

interface Args {
  dependency: string;
  version: string;
  packages: Package[];
}

const getDependency = (dependency?: unknown) => {
  if (typeof dependency === 'string') {
    return dependency;
  }

  return inquirer.prompt([
    {
      name: 'dependency',
      message: `Specify the dependency to update`,
    },
  ]).then(r => r.dependency);
}

const getVersion = (version?: unknown) => {
  if (typeof version === 'string') {
    return version;
  }

  return inquirer.prompt([
    {
      name: 'version',
      message: `Specify the version to update to`,
    },
  ]).then(r => r.version);
};

const isPackages = (packages?: unknown): packages is Package[] => {
  return !!(Array.isArray(packages) && packages.length && typeof packages[0] === 'string');
}

const getPackages = (packages?: unknown) => {
  if (isPackages(packages)) {
    return packages;
  }

  return inquirer.prompt([
    {
      type: 'checkbox',
      name: 'packages',
      message: 'Which packages do you want to update?',
      choices: AVAILABLE_PACKAGES,
    },
  ]).then(r => r.packages);
}

const getArgs = async (): Promise<Args> => {
  const argv = await yargs.command('update-dependency <dependency> <version>', 'update dependency', yargs => {
    yargs.positional('dependency', {
      describe: 'The dependency to update',
    }).positional('version', {
      describe: 'The version to update to',
    }).options({
      packages: { type: 'string' },
    });
  })
  .help()
  .argv;

  const dependency = await getDependency(argv.dependency);
  const version = await getVersion(argv.version);
  const packages = await getPackages(argv.packages);

  return {
    dependency,
    version,
    packages,
  }
}

if (require.main === module) {
  (async () => {
    const { dependency, version, packages } = await getArgs();
    await updateDependency([dependency], version, packages);
  })();
}
