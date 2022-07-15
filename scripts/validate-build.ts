import path from 'path';
import yargs from 'yargs';
import fs from 'fs';
import { getPackageJSON, JSONSchema } from './package-scripts/utils/packages';
import { JSONSchemaForNPMPackageJsonFiles } from '@schemastore/package';

const ROOT = path.resolve(__dirname, '..');
const UPSCALER_JS = path.resolve(ROOT, 'packages/upscalerjs');
const UPSCALER_JS_DIST = path.resolve(UPSCALER_JS, 'dist');

/****
 * Utility methods
 */
const getKeysOfObj = (json: JSONSchema, keys: string[]): Partial<JSONSchema> => {
  return keys.reduce((obj, jsonKey) => {
    if (json[jsonKey]) {
      return {
        ...obj,
        [jsonKey]: json[jsonKey],
      }
    };
    return obj;
  }, {});
};
const getObjAsArray = (obj: Partial<JSONSchema>): string[] => {
  return Object.values(obj).reduce((arr, file) => {
    if (typeof file === 'string') {
      return arr.concat(file);
    }
    return arr.concat(getObjAsArray(file));
  }, [] as string[]);
};

const extractAllFilesFromPackageJSON = (packagePath: string): string[] => {
  const packageJSON = getPackageJSON(packagePath);
  return getObjAsArray(getKeysOfObj(packageJSON, [
    'exports',
    'main',
    'module',
    'types',
    'umd:main',
  ]));
};

/****
 * Main function
 */

const validateBuild = async (packageName: string, include: string[] = []): Promise<Set<string>> => {
  const packagePath = path.resolve(ROOT, packageName);
  const files = new Set([
    ...extractAllFilesFromPackageJSON(packagePath),
    ...include,
  ].map(file => path.resolve(packagePath, file)));
  files.forEach(file => {
    if (!fs.existsSync(path.resolve(UPSCALER_JS_DIST, file))) {
      throw new Error(`File ${file} was not built or does not exist`);
    }
  });
  return files;
};

export default validateBuild;

/****
 * Functions to expose the main function as a CLI tool
 */

interface Args {
  src: string;
  include?: string[];
}

const isValidStringArray = (arr: unknown): arr is string[] => Array.isArray(arr) && typeof arr[0] === 'string';

const getArgs = async (): Promise<Args> => {
  const argv = await yargs.command('validate-build [platform]', 'validate a build', yargs => {
    yargs.positional('src', {
      describe: 'The package to validate',
    }).options({
      include: { alias: 'c', type: 'string', demandOption: true },
    }).nargs('include', 0);
  })
  .help()
  .argv;

  const src = argv['_'][0];
  if (typeof src !== 'string') {
    throw new Error('Invalid src');
  }

  const include = argv.c;
  if (include !== undefined && !isValidStringArray(include)) {
    throw new Error('Is not a valid array')
  }

  return {
    src,
    include,
  }
}

if (require.main === module) {
  (async () => {
    const argv = await getArgs();
    const checkedFiles = await validateBuild(argv.src, argv.include);
    console.log([
      'The following files are present: ',
      ...[...checkedFiles].map(file => {
        return ` - ${file}`;
      }),
    ].join('\n'))
  })();
}

