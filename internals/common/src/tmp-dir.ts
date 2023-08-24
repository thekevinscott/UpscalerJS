import path from 'path';
import { rimraf } from 'rimraf';
import { TMP_DIR } from './constants.js';
import { getHashedName } from './get-hashed-name.js';
import { exists, mkdirp } from './fs.js';

interface WithTmpDirOpts {
  rootDir?: string;
  removeTmpDir?: boolean;
}
type WithTmpDirFn<T> = (tmp: string) => Promise<T>;
export async function withTmpDir<T>(callback: WithTmpDirFn<T>, { rootDir, removeTmpDir = true }: WithTmpDirOpts = {}) {
  const tmpDir = await makeTmpDir(rootDir);

  let response: T;
  try {
    response = await callback(tmpDir);
  }
  finally {
    try {
      if (removeTmpDir) {
        await rimraf(tmpDir);
      }
    }
    catch (e) {
      console.error(`An error has occurred while removing the temp folder at ${tmpDir}. Please remove it manually. Error: ${e}`);
    }
  }
  return response;
};

export const makeTmpDir = async (root = TMP_DIR): Promise<string> => {
  const hashedName = getHashedName();
  const folder = path.resolve(root, hashedName);
  await mkdirp(folder);
  if (!await exists(folder)) {
    throw new Error(`Tmp directory ${folder} was not created`);
  }
  return folder;
};

