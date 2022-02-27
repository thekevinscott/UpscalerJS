import fs from 'fs';
import path from 'path';
import inquirer from 'inquirer';

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
  console.log(`Updated all versions in directory ${getFormattedName(dir)}`);
};

const updateSinglePackage = (dir: string, version: string) => {
  console.log(`Updated single version in directory ${getFormattedName(dir)}`);
};

const getVersion = (dir: string) => {
  const packageJSON = JSON.parse(fs.readFileSync(path.resolve(dir, 'package.json'), 'utf-8'));
  return packageJSON.version;
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
}

const updateVersion = () => new Promise(resolve => {
  inquirer.prompt<Answers>([
    {
      name: 'version',
      message: `Specify the version you wish to change to:\n(${getCurrentVersions()})\n`
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
