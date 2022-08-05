import path from 'path';
import inquirer from 'inquirer';
import isValidVersion from './utils/isValidVersion';
import { AVAILABLE_PACKAGES, CORE, DIRECTORIES, EXAMPLES, getPackageJSON, getPackageJSONPath, getPreparedFolderName, Package, PackageUpdaterLogger, ROOT, TransformPackageJsonFn, updateMultiplePackages, updateSinglePackage, UPSCALER_JS, WRAPPER } from './utils/packages';

/****
 * Type Definitions
 */
type Answers = { packages: Array<Package>, version: string, updateDependencies?: boolean, }

/****
 * Constants
 */
const ROOT_DIR = path.resolve(__dirname, '../..');

const logger: PackageUpdaterLogger = (file: string) => {
  return `- Updated ${getPreparedFolderName(getPackageJSONPath(file))}`;
}

const makeSetVersionForPackageJSON = (version: string): TransformPackageJsonFn => (packageJSON) => {
  packageJSON.version = version;
  return packageJSON;
}

const getVersion = (dir: string) => {
  return getPackageJSON(dir).version;
};

const getCurrentVersions = () => {
  const upscalerJSVersion = getVersion(DIRECTORIES[UPSCALER_JS].directory);
  const rootVersion = getVersion(DIRECTORIES[ROOT].directory);
  const coreVersion = getVersion(DIRECTORIES[CORE].directory);
  return [
    `root: ${rootVersion}`,
    `upscaler: ${upscalerJSVersion}`,
    `core: ${coreVersion}`,
  ].join(' | ');
};

const updateVersion = (): Promise<void> => new Promise(resolve => {
  inquirer.prompt<Answers>([
    {
      name: 'version',
      message: `Specify the version you wish to change to:\n(${getCurrentVersions()})\n`,
      default: getVersion(ROOT_DIR),
    },
    {
      type: 'checkbox',
      name: 'packages',
      message: 'Which packages do you want to update?',
      choices: AVAILABLE_PACKAGES,
    },
    {
      name: 'updateDependencies',
      message: `Since UpscalerJS's version will be updated, do you also want to update packages (like examples) that reference it?`,
      type: 'confirm',
      default: true,
      when: ({ packages }: Omit<Answers, 'updateDependencies'>) => packages.includes('UpscalerJS'),
    },
    // {
    //   name: 'commit',
    //   message: `Do you wish to commit changes`,
    //   type: 'confirm',
    //   default: true,
    // },
  ]).then(async ({ version, packages, 
    // commit, 
    updateDependencies }) => {
    if (!isValidVersion(version)) {
      throw new Error(`Version is not in the format x.x.x. You specified: ${version}`);
    }
    if (packages.length === 0) {
      console.log('No packages selected, nothing to do.')
      return;
    }

    const setVersionForPackageJSON = makeSetVersionForPackageJSON(version);

    await Promise.all(packages.map(async packageKey => {
      const pkg = DIRECTORIES[packageKey];
      if (pkg === undefined) {
        throw new Error(`Package ${packageKey} is not defined.`);
      }
      const { multiple, directory } = pkg;
      const fn = multiple ? updateMultiplePackages : updateSinglePackage;
      return await fn(directory, setVersionForPackageJSON, logger);
    }));
    if (updateDependencies) {
      const dependencyDirectories = [DIRECTORIES[EXAMPLES], DIRECTORIES[WRAPPER]];
      const dependencyUpdater: TransformPackageJsonFn = packageJSON => {
        const deps = packageJSON.dependencies;
        if (deps) {
          return {
            ...packageJSON,
            dependencies: {
              ...deps,
              'upscaler': version,
            }
          };
        }
        return packageJSON;
      }
      const dependencyLogger: PackageUpdaterLogger = dir => {
        return `- Updated "upscaler" dependency in ${getPreparedFolderName(dir)}`;
      };
      for (let i = 0; i < dependencyDirectories.length; i++) {
        const { directory, multiple } = dependencyDirectories[i];
        const fn = multiple ? updateMultiplePackages : updateSinglePackage;
        fn(directory, dependencyUpdater, dependencyLogger);
      }
    }
    // if (commit) {
    //   const cmd = `git commit -m "Updated version to ${version} for ${formatArray(packages)}"`;
    //   await new Promise(resolve => setTimeout(resolve, 100));
    //   try {
    //     await execute(cmd);
    //   } catch(err) {
    //     console.error('*******', err)
    //     throw err;
    //   }
    // }
    resolve();
  });
});

export default updateVersion;

if (require.main === module) {
  updateVersion();
}
