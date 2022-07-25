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
