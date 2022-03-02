import fs from 'fs';
import path from 'path';
import inquirer from 'inquirer';
import findAllPackages from './find-all-packages';
import isValidVersion from './utils/isValidVersion';
import execute from './utils/execute';

type Package = 'UpscalerJS' | 'Models' | 'Examples' | 'Root';
type Answers = { packages: Array<Package>, version: string, commit: boolean }

const ROOT_DIR = path.resolve(__dirname, '../..');
const PACKAGES_DIR = path.resolve(ROOT_DIR, 'packages');
const UPSCALERJS_DIR = path.resolve(PACKAGES_DIR, 'upscalerjs');
const MODELS_DIR = path.resolve(PACKAGES_DIR, 'models');
const EXAMPLES_DIR = path.resolve(ROOT_DIR, 'examples');

const getFormattedName = (file: string) => {
  return file.split(`${ROOT_DIR}/`).pop();
};

const updateMultiplePackages = async (dir: string, version: string, commit: boolean) => {
  const packages = findAllPackages(dir);
  for (let i = 0; i < packages.length; i++) {
    const pkg = packages[i];
    await updateSinglePackage(pkg, version, commit);
  }
};

const updateSinglePackage = async (dir: string, version: string, commit: boolean) => {
  const packageJSON = getPackageJSON(dir);
  packageJSON.version = version;
  writePackageJSON(dir, packageJSON);
  if (commit) {
    await commitPackageJSON(dir);
  }
  console.log(`- Updated ${getFormattedName(dir)}`);
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
  const modelsVersion = getVersion(MODELS_DIR);
  return [
    `root: ${rootVersion}`,
    `upscaler: ${upscalerJSVersion}`,
    `models: ${modelsVersion}`,
  ].join(' | ');
};


const updateVersion = () => new Promise(resolve => {
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
      choices: [
        'UpscalerJS', 'Models', 'Examples', 'Root',
      ],
    },
    {
      name: 'commit',
      message: `Do you wish to commit changes`,
      type: 'confirm',
      default: true,
    },
  ]).then(async ({ version, packages, commit }) => {
    if (!isValidVersion(version)) {
      throw new Error(`Version is not in the format x.x.x. You specified: ${version}`);
    }
    if (packages.length === 0) {
      console.log('No packages selected, nothing to do.')
      return;
    }

    await Promise.all(packages.map(packageKey => {
      if (packageKey === 'Examples') {
        return updateMultiplePackages(EXAMPLES_DIR, version, commit);
      } else if (packageKey === 'Models') {
        return updateSinglePackage(MODELS_DIR, version, commit);
      } else if (packageKey === 'UpscalerJS') {
        return updateSinglePackage(UPSCALERJS_DIR, version, commit);
      } else if (packageKey === 'Root') {
        return updateSinglePackage(ROOT_DIR, version, commit);
      }
    }));
    if (commit) {
      const cmd = `git commit -m "Updated version to ${version} for ${formatArray(packages)}"`;
      console.log(cmd);
      await execute(cmd);
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
