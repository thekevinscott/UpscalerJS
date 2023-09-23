import { exists, readFile, writeFile } from '@internals/common/fs';
import path from 'path';
import { rimraf } from 'rimraf';

const removePackageFromDisk = async (STORAGE_DIR: string, packageName: string) => {
  const pathToPackageInStorage = path.resolve(STORAGE_DIR, packageName);
  await rimraf(pathToPackageInStorage);
  if (await exists(pathToPackageInStorage)) {
    throw new Error(`Package was not deleted, the folder ${pathToPackageInStorage} still exists on disk`)
  }
};

const resetDB = async (STORAGE_DIR: string, packages: Array<string>) => {
  const DB_PATH = path.resolve(STORAGE_DIR, '.verdaccio-db.json');
  if (await exists(DB_PATH)) {
    // do this sequentially
    const { list, ...rest } = JSON.parse(await readFile(DB_PATH));
    const newDB = {
      list: list.reduce((acc: Array<string>, packageName: string) => {
        if (packages.includes(packageName)) {
          // don't add it to the list
          return acc;
        }
        return acc.concat(packageName);
      }, []),
      ...rest
    };
    await writeFile(DB_PATH, JSON.stringify(newDB, null, 2));
  }
};

export const removePackages = (STORAGE_DIR: string, packages: Array<string>) => Promise.all([
  ...packages.map(packageName => removePackageFromDisk(STORAGE_DIR, packageName)),
  resetDB(STORAGE_DIR, packages),
]);
