import path from 'path';
import { sync as rimraf } from 'rimraf';
import { existsSync, mkdirpSync } from 'fs-extra';
import { getHashedName } from './getHashedName';
import { TMP_DIR } from './constants';

interface WithTmpDirOpts {
  rootDir?: string;
  removeTmpDir?: boolean;
}
type WithTmpDir = (callback: WithTmpDirFn, opts?: WithTmpDirOpts) => (Promise<void> | void);
type WithTmpDirFn = (tmp: string) => Promise<void>;
export const withTmpDir: WithTmpDir = async (callback, { rootDir, removeTmpDir = true } = {}) => {
  const tmpDir = makeTmpDir(rootDir);

  try {
    await callback(tmpDir);
  }
  finally {
    try {
      if (removeTmpDir) {
        rimraf(tmpDir);
      }
    }
    catch (e) {
      console.error(`An error has occurred while removing the temp folder at ${tmpDir}. Please remove it manually. Error: ${e}`);
    }
  }
};

export const makeTmpDir = (root = TMP_DIR): string => {
  const hashedName = getHashedName(`${Math.random()}`);
  const folder = path.resolve(root, hashedName);
  mkdirpSync(folder);
  if (!existsSync(folder)) {
    throw new Error(`Tmp directory ${folder} was not created`);
  }
  return folder;
};
