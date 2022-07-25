import yargs from 'yargs';
import path from 'path';
import inquirer, { DistinctQuestion } from 'inquirer';
import {
  AVAILABLE_PACKAGES,
  getPackageJSON,
  Package,
} from './utils/packages';
import updateDependency, { getMatchingDependency } from './update-dependency';

/****
 * Constants
 */
const ROOT_DIR = path.resolve(__dirname, '../..');

const TFJS_PACKAGES = [
  '@tensorflow/tfjs',
  '@tensorflow/tfjs-node',
  '@tensorflow/tfjs-node-gpu',
  '@tensorflow/tfjs-layers',
  '@tensorflow/tfjs-core',
];

/****
 * Main function
 */

const updateTFJS = (version: string, packages: Package[]) => updateDependency(TFJS_PACKAGES, version, packages);

export default updateTFJS;

/****
 * Functions to expose the main function as a CLI tool
 */
const getTFJSVersion = (dir: string): string => {
  const packageJSON = getPackageJSON(dir);
  const deps = packageJSON.peerDependencies;
  const gen = getMatchingDependency(TFJS_PACKAGES, deps);
  const matchingTFJS = gen.next().value;
  if (!matchingTFJS) {
    throw new Error(`Could not find a dependency matching @tensorflow/tfjs in ${dir}`);
  }
  const [_, val] = matchingTFJS;
  return val;
};

type TypecheckFunction<T> = (value?: unknown) => value is T;
function getArg<T>(typecheckFunction: TypecheckFunction<T>, question: { name: string } & DistinctQuestion) {
  return (value?: unknown) => typecheckFunction(value) ? value : inquirer.prompt(question).then(r => r[question.name]);
};

const isVersion = (version?: unknown): version is string => typeof version === 'string';
const getVersion = getArg(isVersion, {
  name: 'value',
  message: `Specify the version to update to`,
  default: getTFJSVersion(ROOT_DIR),
});

const isPackages = (packages?: unknown): packages is Package[] => {
  return !!(Array.isArray(packages) && packages.length && typeof packages[0] === 'string');
}
const getPackages = getArg(isPackages, {
  type: 'checkbox',
  name: 'packages',
  message: 'Which packages do you want to update?',
  choices: AVAILABLE_PACKAGES,
});

interface Args {
  version: string;
  packages: Package[];
}

const getArgs = async (): Promise<Args> => {
  const argv = await yargs.command('update-dependency <dependency> <version>', 'update dependency', yargs => {
    yargs.positional('version', {
      describe: 'The version to update to',
    }).options({
      packages: { type: 'string' },
    });
  })
  .help()
  .argv;

  const version = await getVersion(argv.version);
  const packages = await getPackages(argv.packages);

  return {
    version,
    packages,
  }
}

if (require.main === module) {
  (async () => {
    const { version, packages } = await getArgs();
    await updateTFJS(version, packages);
  })();
}





/*
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

