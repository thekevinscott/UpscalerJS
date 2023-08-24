import { mkdirp } from '@internals/common/fs';
import { compileTypescript } from '../../utils/compile-typescript.js';

export const buildESM = async (distFolder: string, srcFolder: string) => {
  await mkdirp(distFolder);
  await compileTypescript(srcFolder, 'esm', {
    outDir: distFolder,
  });
};
