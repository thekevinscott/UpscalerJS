import { mkdirp } from '@internals/common/fs';
import { compileTypescript } from '../../utils/compile-typescript.js';

export const buildCJS = async (distFolder: string, srcFolder: string) => {
  await mkdirp(distFolder);
  await compileTypescript(srcFolder, 'cjs', {
    outDir: distFolder,
  });
};
