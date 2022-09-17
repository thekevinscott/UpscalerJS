import path from 'path';
import rimraf from 'rimraf';
import fs from 'fs';
import { mkdirpSync } from 'fs-extra';
import { getHashedName } from './getHashedName';

const ROOT = path.join(__dirname, '../../..');

interface WithTmpDirOpts {
  rootDir?: string;
  removeTmpDir?: boolean;
}
type WithTmpDir = (callback: WithTmpDirFn, opts?: WithTmpDirOpts) => (Promise<void> | void);
type WithTmpDirFn = (tmp: string) => Promise<void>;
export const withTmpDir: WithTmpDir = async (callback, { rootDir, removeTmpDir } = {}) => {
  const tmpDir = makeTmpDir(rootDir);

  try {
    await callback(tmpDir);
  }
  finally {
    try {
      if (tmpDir && removeTmpDir) {
        rimraf.sync(tmpDir);
      }
    }
    catch (e) {
      console.error(`An error has occurred while removing the temp folder at ${tmpDir}. Please remove it manually. Error: ${e}`);
    }
  }
};

export const makeTmpDir = (root = path.resolve(ROOT, 'tmp')): string => {
  const folder = path.resolve(root, getHashedName(`${Math.random()}`));
  mkdirpSync(folder);
  if (!fs.existsSync(folder)) {
    throw new Error(`Tmp directory ${folder} was not created`);
  }
  return folder;
};
