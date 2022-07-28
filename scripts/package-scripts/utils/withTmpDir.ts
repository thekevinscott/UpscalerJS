import path from 'path';
import crypto from 'crypto';
import rimraf from 'rimraf';
import fs from 'fs';
import { mkdirp } from 'fs-extra';

const ROOT = path.join(__dirname, '../../..');

interface WithTmpDirOpts {
  rootDir?: string;
  removeTmpDir?: boolean;
}
type WithTmpDir = (callback: WithTmpDirFn, opts?: WithTmpDirOpts) => Promise<void>
type WithTmpDirFn = (tmp: string) => Promise<void>;
export const withTmpDir: WithTmpDir = async (callback, { rootDir, removeTmpDir } = {}) => {
  let tmpDir = await getTmpDir(rootDir);
  if (!fs.existsSync(tmpDir)) {
    throw new Error(`Tmp directory ${tmpDir} was not created`);
  }

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

const getTmpDir = async (root = path.resolve(ROOT, 'tmp')): Promise<string> => {
  const folder = path.resolve(root, getHashedName(`${Math.random()}`));
  await mkdirp(folder);
  return folder;
};

export const getHashedName = (contents: string) => crypto.createHash('md5').update(contents).digest('hex');
