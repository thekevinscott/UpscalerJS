import yargs from 'yargs';
import path from 'path';
import inquirer, { DistinctQuestion, QuestionCollection } from 'inquirer';
import isValidVersion from './utils/isValidVersion';
import { AVAILABLE_PACKAGES, DIRECTORIES, getPackageJSON, getPackageJSONPath, getPackageJSONValue, getPreparedFolderName, Package, ROOT, TransformPackageJsonFn, updateMultiplePackages, updatePackageJSONForKey, updateSinglePackage, UPSCALER_JS } from './utils/packages';
import { Dependency } from '@schemastore/package';
import updateDependency, { getMatchingDependency } from './update-dependency';

/****
 * Constants
 */
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
type TypecheckFunction<T> = (value?: unknown) => value is T;
function getArg<T>(typecheckFunction: TypecheckFunction<T>, question: { name: string } & DistinctQuestion) {
  return (value?: unknown) => typecheckFunction(value) ? value : inquirer.prompt(question).then(r => r[question.name]);
};

const isVersion = (version?: unknown): version is string => typeof version === 'string';
const getVersion = getArg(isVersion, {
  name: 'value',
  message: `Specify the version to update to`,
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
