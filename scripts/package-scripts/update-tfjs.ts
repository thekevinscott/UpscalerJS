import fs from 'fs';
import path from 'path';
import inquirer from 'inquirer';
import isValidVersion from './utils/isValidVersion';
import { AVAILABLE_PACKAGES, DIRECTORIES, getPackageJSON, getPackageJSONPath, getPackageJSONValue, getPreparedFolderName, Package, PackageUpdaterLogger, ROOT, TransformPackageJsonFn, updateMultiplePackages, updatePackageJSONForKey, updateSinglePackage, UPSCALER_JS } from './utils/packages';
import { Dependency } from '@schemastore/package';

type Answers = { packages: Array<Package>, version: string}

const ROOT_DIR = path.resolve(__dirname, '../..');

const makeSetVersionForPackageJSON = (version: string): TransformPackageJsonFn => (packageJSON, dir) => {
  const dependencyKeys = ['dependencies', 'peerDependencies', 'devDependencies', 'pnpm.overrides'];
  const updates: Array<string> = [];
  for (let i = 0; i < dependencyKeys.length; i++) {
    const depKey = dependencyKeys[i];
    const deps = getPackageJSONValue(packageJSON, depKey);
    if (deps) {
      const gen = getMatchingTFJS(deps);
      let value = gen.next().value;
      while (value) {
        const [key] = value;
        deps[key] = version;
        value = gen.next().value;
        updates.push(`  - ${depKey}: ${key}`);
      }
      packageJSON = updatePackageJSONForKey(packageJSON, depKey, deps)
    }
  }
  if (updates.length) {
    console.log(`- Updated ${getPreparedFolderName(getPackageJSONPath(dir))}`);
    updates.forEach(message => console.log(message))
  }
  return packageJSON;
}


// const writePackageJSON = (file: string, contents: Record<string, string | number | Object | Array<any>>) => {
//   const stringifiedContents = `${JSON.stringify(contents, null, 2)}\n`;
//   if (file.endsWith('package.json')) {
//     fs.writeFileSync(file, stringifiedContents);
//   } else {
//     fs.writeFileSync(path.resolve(file, 'package.json'), stringifiedContents);
//   }
// };

function* getMatchingTFJS(deps?: Dependency) {
  if (deps) {
    const entries = Object.entries(deps);
    for (let i = 0; i < entries.length; i++) {
      const [key, val] = entries[i];
      if (key.startsWith('@tensorflow/tfjs')) {
        yield [key, val];
      }
    }
  }
}

const getVersion = (dir: string): string => {
  const packageJSON = getPackageJSON(dir);
  const deps = packageJSON.peerDependencies;
  const gen = getMatchingTFJS(deps);
  const matchingTFJS = gen.next().value;
  if (!matchingTFJS) {
    throw new Error(`Could not find a dependency matching @tensorflow/tfjs in ${dir}`);
  }
  const [_, val] = matchingTFJS;
  return val;
};

const getCurrentVersions = () => {
  const upscalerJSVersion = getVersion(DIRECTORIES[UPSCALER_JS].directory);
  const rootVersion = getVersion(DIRECTORIES[ROOT].directory);
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
      default: getVersion(ROOT_DIR),
    },
    {
      type: 'checkbox',
      name: 'packages',
      message: 'Which packages do you want to update?',
      choices: AVAILABLE_PACKAGES,
    },
  ]);
  if (!isValidVersion(version)) {
    throw new Error(`Version is not in the format x.x.x. You specified: ${version}`);
  }
  if (packages.length === 0) {
    console.log('No packages selected, nothing to do.')
    return;
  }

    const setVersionForPackageJSON = makeSetVersionForPackageJSON(version);

    await Promise.all(packages.map(packageKey => {
      const pkg = DIRECTORIES[packageKey];
      if (pkg === undefined) {
        throw new Error(`Package ${packageKey} is not defined.`);
      }
      const { multiple, directory } = pkg;
      const fn = multiple ? updateMultiplePackages : updateSinglePackage;
      return fn(directory, setVersionForPackageJSON);
    }));
//   packages.forEach(packageKey => {
//     if (packageKey === EXAMPLES) {
//       updateMultiplePackages(EXAMPLES_DIR, version)
//     } else if (packageKey === 'Test') {
//       updateMultiplePackages(TEST_DIR, version)
//     } else if (packageKey === UPSCALER_JS) {
//       updateSinglePackage(UPSCALERJS_DIR, version)
//     } else if (packageKey === ROOT) {
//       updateSinglePackage(ROOT_DIR, version)
//     } else if (packageKey === CORE) {
//       updateSinglePackage(CORE_DIR, version);
//     } else if (packageKey === WRAPPER) {
//       updateSinglePackage(WRAPPER_DIR, version);
//     }
// // const AVAILABLE_PACKAGES = [ UPSCALER_JS, MODELS, EXAMPLES, ROOT, CORE, WRAPPER ];
//   });
};

export default updateTFJS;

if (require.main === module) {
  updateTFJS();
}

