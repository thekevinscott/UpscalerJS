import {Args, Command, Flags} from '@oclif/core';
import path from 'path';
import { exists } from '@internals/common/fs';
import { getPackageJSON, JSONSchema } from '@internals/common/package-json';
import { sync } from 'glob';
import { ROOT_DIR } from '@internals/common/constants';
import { BaseCommand } from '../base-command.js';

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

export const validateBuild = async (packageName: string, include: string[] = [], {
  includeFilesFromPackageJson = true,
}: {
  includeFilesFromPackageJson?: boolean;
} = { }): Promise<Set<string>> => {
  const packagePath = path.resolve(ROOT_DIR, packageName);
  const files = new Set([
    ...(includeFilesFromPackageJson ? await extractAllFilesFromPackageJSON(packagePath) : []),
    ...include,
  ].map(file => path.resolve(packagePath, file)));
  const packageDistPath = path.resolve(packagePath, 'dist');
  for (const file of files) {
    if (!await exists(path.resolve(packageDistPath, file))) {
      const existingFiles: string[] = sync(path.resolve(packageDistPath, '**/*'));
      console.log('files that we checked', files);
      throw new Error([
        `File ${file} was not built or does not exist.`,
        `Existing files include: \n${existingFiles.map(f => ` - ${f}`).join('\n')}`,
        `Files we are checking include: \n${Array.from(files).map(f => ` - ${f}`).join('\n')}`,
      ].join('\n'));
    }
  }
  return files;
};

export default class ValidatePackage extends BaseCommand<typeof ValidatePackage> {
  static description = 'Validate a package'

  static args = {
    package: Args.string({description: 'Package to validate', required: true}),
  }

  static flags = {
    include: Flags.string({ char: 'c', description: 'Extra files to include in validation', multiple: true }),
    includeFilesFromPackageJson: Flags.boolean({ char: 'i', description: 'Whether to include files from package.json', default: false })
  }

  async run(): Promise<void> {
    const { args, flags: { include, includeFilesFromPackageJson } } = await this.parse(ValidatePackage);
    await validateBuild(args.package, include, { includeFilesFromPackageJson });
  }
}
