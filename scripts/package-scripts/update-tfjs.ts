import fs from 'fs';
import path from 'path';
import inquirer from 'inquirer';
import findAllPackages from './find-all-packages';
import isValidVersion from './utils/isValidVersion';

type Package = 'UpscalerJS' | 'Core' | 'Test' | 'Examples' | 'Root';
type Answers = { packages: Array<Package>, version: string}

const ROOT_DIR = path.resolve(__dirname, '../..');
const PACKAGES_DIR = path.resolve(ROOT_DIR, 'packages');
const UPSCALERJS_DIR = path.resolve(PACKAGES_DIR, 'upscalerjs');
const CORE_DIR = path.resolve(PACKAGES_DIR, 'core');
const TEST_DIR = path.resolve(ROOT_DIR, 'test/lib');
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
  const dependencyKeys = ['dependencies', 'peerDependencies', 'devDependencies'];
  for (let i = 0; i < dependencyKeys.length; i++) {
    const depKey = dependencyKeys[i];
    const deps = packageJSON[depKey];
    if (deps) {
      const gen = getMatchingTFJS(deps);
      let value = gen.next().value;
      while (value) {
        const [key] = value;
        deps[key] = version;
        value = gen.next().value;
      }
      packageJSON[depKey] = deps;
    }
  }
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

function* getMatchingTFJS(deps: Record<string, string>) {
  const entries = Object.entries(deps);
  for (let i = 0; i < entries.length; i++) {
    const [key, val] = entries[i];
    if (key.startsWith('@tensorflow/tfjs')) {
      yield [key, val];
    }
  }
}

const getVersion = (dir: string) => {
  const packageJSON = getPackageJSON(dir);
  const deps = packageJSON.peerDependencies;
  const gen = getMatchingTFJS(deps);
  const val = gen.next().value;
  if (!val) {
    throw new Error(`Could not find a dependency matching @tensorflow/tfjs in ${dir}`);
  }
  return val;
};

const getCurrentVersions = () => {
  const [_1, upscalerJSVersion] = getVersion(UPSCALERJS_DIR);
  const [_2, rootVersion] = getVersion(ROOT_DIR);
  return [
    `root: ${rootVersion}`,
    `upscaler: ${upscalerJSVersion}`,
  ].join(' | ');
};

const updateTFJS = async () => {
  const { version, packages } = await inquirer.prompt<Answers>([
    {
      name: 'version',
      message: `Specify the version of TFJS you wish to set:\n(${getCurrentVersions()})\n`,
      default: getVersion(ROOT_DIR)[1],
    },
    {
      type: 'checkbox',
      name: 'packages',
      message: 'Which packages do you want to update?',
      choices: [
        'UpscalerJS', 'Test', 'Examples', 'Root',
      ],
    },
  ]);
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
    } else if (packageKey === 'Test') {
      updateMultiplePackages(TEST_DIR, version)
    } else if (packageKey === 'UpscalerJS') {
      updateSinglePackage(UPSCALERJS_DIR, version)
    } else if (packageKey === 'Root') {
      updateSinglePackage(ROOT_DIR, version)
    } else if (packageKey === 'Core') {
      updateSinglePackage(CORE_DIR, version);
    }
  });
};

export default updateTFJS;

if (require.main === module) {
  updateTFJS();
}

