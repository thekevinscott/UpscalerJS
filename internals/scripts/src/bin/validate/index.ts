import path from 'path';
import fs from 'fs';
import { getPackageJSON, JSONSchema } from '@internals/common/package-json';
import { sync } from 'glob';
import { ROOT_DIR } from '@internals/common/constants';
import { output } from '@internals/common/logger';
import { parseArgs } from 'node:util';

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

export const extractAllFilesFromPackageJSON = async (packagePath: string): Promise<string[]> => {
  const packageJSON = await getPackageJSON(packagePath);
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

const validateBuild = async (packageName: string): Promise<Set<string>> => {
  const packagePath = path.resolve(ROOT_DIR, packageName);
  const files = new Set([
    ...(await extractAllFilesFromPackageJSON(packagePath)),
  ].map(file => path.resolve(packagePath, file)));
  const packageDistPath = path.resolve(packagePath, 'dist');
  files.forEach(file => {
    if (!fs.existsSync(path.resolve(packageDistPath, file))) {
      const existingFiles: string[] = sync(path.resolve(packageDistPath, '**/*'));
      throw new Error([
        `File ${file} was not built or does not exist.`,
        existingFiles.length === 0 ? 'No existing files were found' : `Existing files include: \n${existingFiles.map(f => ` - ${f}`).join('\n')}`,
        `Files we are checking include: \n${Array.from(files).map(f => ` - ${f}`).join('\n')}`,
      ].join('\n'));
    }
  });
  return files;
};

const main = async () => {
  const {
    positionals: [
      src,
    ]
  } = parseArgs({
    allowPositionals: true,
  });

  const checkedFiles = Array.from(await validateBuild(src));
  output([
    'The following files are present: ',
    ...checkedFiles.map(file => {
      return ` - ${file}`;
    }),
  ].join('\n'))
};

main();
