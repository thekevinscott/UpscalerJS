import fs from 'fs';
import path from 'path';
import inquirer from 'inquirer';
import findAllPackages from './find-all-packages';
import isValidVersion from './utils/isValidVersion';
import execute from './utils/execute';

type PackageJson = Record<string, any>;
type Package = 'UpscalerJS' | 'Core' | 'Models' | 'Examples' | 'Root' | 'Wrapper';
type Answers = { packages: Array<Package>, version: string, commit: boolean, updateDependencies?: boolean, }
type GetMessage = (file: string) => string;

const ROOT_DIR = path.resolve(__dirname, '../..');
const PACKAGES_DIR = path.resolve(ROOT_DIR, 'packages');
const UPSCALERJS_DIR = path.resolve(PACKAGES_DIR, 'upscalerjs');
const CORE_DIR = path.resolve(PACKAGES_DIR, 'core');
const WRAPPER_DIR = path.resolve(PACKAGES_DIR, 'upscalerjs-wrapper');
const MODELS_DIR = path.resolve(ROOT_DIR, 'models');
const EXAMPLES_DIR = path.resolve(ROOT_DIR, 'examples');

const getFormattedName = (file: string) => {
  return file.split(`${ROOT_DIR}/`).pop();
};

type TransformFn = (packageJSON: PackageJson, version: string) => PackageJson;
const updateMultiplePackages = async (dir: string, version: string, commit: boolean, transform?: TransformFn, getMessage: GetMessage = defaultGetMessage) => {
  const packages = findAllPackages(dir);
  for (let i = 0; i < packages.length; i++) {
    const pkg = packages[i];
    await updateSinglePackage(pkg, version, commit, transform, getMessage);
  }
};

const defaultTransform: TransformFn = (packageJSON, version) => {
  packageJSON.version = version;
  return packageJSON;
}

const defaultGetMessage: GetMessage = (file: string) => {
  if (file.endsWith('package.json')) {
    return `- Updated ${getFormattedName(file)}`;
  }
  return `- Updated ${getFormattedName(`${file}/package.json`)}`;
}

const updateSinglePackage = async (dir: string, version: string, commit: boolean, transform: TransformFn = defaultTransform, getMessage: GetMessage = defaultGetMessage) => {
  const packageJSON = getPackageJSON(dir);
  writePackageJSON(dir, transform(packageJSON, version));
  if (commit) {
    await commitPackageJSON(dir);
  }
  console.log(getMessage(dir));
};

const getPackageJSONPath = (file: string) => {
  if (file.endsWith('package.json')) {
    return file;
  }
  return path.resolve(file, 'package.json');
}

const commitPackageJSON = async (dir: string) => {
  const file = getPackageJSONPath(dir);
  const cmd = `git add "${file}"`
  await execute(cmd);
}

const writePackageJSON = (file: string, contents: Record<string, string | number | Object | Array<any>>) => {
  const stringifiedContents = `${JSON.stringify(contents, null, 2)}\n`;
  fs.writeFileSync(getPackageJSONPath(file), stringifiedContents);
};

const getPackageJSON = (file: string) => JSON.parse(fs.readFileSync(getPackageJSONPath(file), 'utf-8'));

const getVersion = (dir: string) => {
  return getPackageJSON(dir).version;
};

const getCurrentVersions = () => {
  const upscalerJSVersion = getVersion(UPSCALERJS_DIR);
  const rootVersion = getVersion(ROOT_DIR);
  const coreVersion = getVersion(CORE_DIR);
  return [
    `root: ${rootVersion}`,
    `upscaler: ${upscalerJSVersion}`,
    `models: ${coreVersion}`,
  ].join(' | ');
};

const UPSCALER_JS = 'UpscalerJS';
const CORE = 'Core';
const ROOT = 'Root';
const WRAPPER = 'Wrapper';
const EXAMPLES = 'Examples';
const MODELS = 'Models';
const AVAILABLE_PACKAGES = [ UPSCALER_JS, MODELS, EXAMPLES, ROOT, CORE, WRAPPER ];

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
    {
      name: 'commit',
      message: `Do you wish to commit changes`,
      type: 'confirm',
      default: true,
    },
  ]).then(async ({ version, packages, commit, updateDependencies }) => {
    if (!isValidVersion(version)) {
      throw new Error(`Version is not in the format x.x.x. You specified: ${version}`);
    }
    if (packages.length === 0) {
      console.log('No packages selected, nothing to do.')
      return;
    }

    await Promise.all(packages.map(packageKey => {
      if (packageKey === EXAMPLES) {
        return updateMultiplePackages(EXAMPLES_DIR, version, commit);
      } else if (packageKey === MODELS) {
        return updateSinglePackage(MODELS_DIR, version, commit);
      } else if (packageKey === CORE) {
        return updateSinglePackage(CORE_DIR, version, commit);
      } else if (packageKey === UPSCALER_JS) {
        return updateSinglePackage(UPSCALERJS_DIR, version, commit);
      } else if (packageKey === ROOT) {
        return updateSinglePackage(ROOT_DIR, version, commit);
      } else if (packageKey === WRAPPER) {
        return updateSinglePackage(WRAPPER_DIR, version, commit);
      }
      
    }));
    if (updateDependencies) {
      updateMultiplePackages(EXAMPLES_DIR, version, commit, packageJSON => {
        const deps = packageJSON.dependencies;
        deps['upscaler'] = version;
        return packageJSON;
      }, dir => {
        return `- Updated "upscaler" dependency in ${getFormattedName(dir)}`;
      });
      updateSinglePackage(WRAPPER_DIR, version, commit, packageJSON => {
        const deps = packageJSON.dependencies;
        deps['upscaler'] = version;
        return packageJSON;
      }, dir => {
        return `- Updated "upscaler" dependency in ${getFormattedName(dir)}`;
      });
    }
    if (commit) {
      const cmd = `git commit -m "Updated version to ${version} for ${formatArray(packages)}"`;
      await new Promise(resolve => setTimeout(resolve, 100));
      try {
        await execute(cmd);
      } catch(err) {
        console.error('*******', err)
        throw err;
      }
    }
    resolve();
  });
});

export default updateVersion;

if (require.main === module) {
  updateVersion();
}

const formatArray = (packages: Array<string>) => {
  if (packages.length === 1) {
    return packages[0];
  }
  if (packages.length === 2) {
    return packages.join(' and ');
  }
  return [
    packages.slice(0, -1).join(', '),
    packages.pop(),
  ].join(' and ');
}
