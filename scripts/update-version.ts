import fs from 'fs';
import path from 'path';
import inquirer from 'inquirer';
import findAllPackages from './find-all-packages';

type Package = 'UpscalerJS' | 'Models' | 'Examples' | 'Root';
type Answers = { packages: Array<Package>, version: string}

const ROOT_DIR = path.resolve(__dirname, '..');
const PACKAGES_DIR = path.resolve(ROOT_DIR, 'packages');
const UPSCALERJS_DIR = path.resolve(PACKAGES_DIR, 'upscalerjs');
const MODELS_DIR = path.resolve(PACKAGES_DIR, 'models');
const EXAMPLES_DIR = path.resolve(ROOT_DIR, 'examples');

const getFormattedName = (file: string) => {
  return file.split(`${ROOT_DIR}/`).pop();
};

const updateMultiplePackages = (dir: string, version: string) => {
  const packages = findAllPackages(dir);
  for (let i = 0; i < packages.length; i++) {
    const pkg = packages[i];
    updateSinglePackage(pkg, version);
  }
};

const updateSinglePackage = (dir: string, version: string) => {
  const packageJSON = getPackageJSON(dir);
  packageJSON.version = version;
  writePackageJSON(dir, packageJSON);
  console.log(`- Updated ${getFormattedName(dir)}`);
};

const writePackageJSON = (file: string, contents: Record<string, string | number | Object | Array<any>>) => {
  const stringifiedContents = `${JSON.stringify(contents, null, 2)}\n`;
  if (file.endsWith('package.json')) {
    fs.writeFileSync(file, stringifiedContents);
  } else {
    fs.writeFileSync(path.resolve(file, 'package.json'), stringifiedContents);
  }
};

const getPackageJSON = (file: string) => {
  if (file.endsWith('package.json')) {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  }
  return JSON.parse(fs.readFileSync(path.resolve(file, 'package.json'), 'utf-8'));
}

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

const isValidVersion = (version: string) => {
  const parts = version.split(".");
  if (parts.length !== 3) {
    return false;
  }
  for (let i = 0; i < 3; i++) {
    try {
      parseInt(parts[i], 10);
    } catch(err) {
      return false;
    }
  }
  return true;
}

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
  ]).then(({ version, packages }) => {
    if (!isValidVersion(version)) {
      throw new Error(`Version is not in the format x.x.x. You specified: ${version}`);
    }
    if (packages.length === 0) {
      console.log('No packages selected, nothing to do.')
      return;
    }

    packages.forEach(packageKey => {
      if (packageKey === 'Examples') {
        updateMultiplePackages(EXAMPLES_DIR, version)
      } else if (packageKey === 'Models') {
        updateSinglePackage(MODELS_DIR, version)
      } else if (packageKey === 'UpscalerJS') {
        updateSinglePackage(UPSCALERJS_DIR, version)
      } else if (packageKey === 'Root') {
        updateSinglePackage(ROOT_DIR, version)
      }
    });
  }).then(() => {
    resolve();
  });
});

module.exports = updateVersion;

if (require.main === module) {
  updateVersion();
}
