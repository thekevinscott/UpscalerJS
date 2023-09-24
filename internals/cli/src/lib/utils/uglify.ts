import path from 'path';
import { readFile, writeFile } from '@internals/common/fs';
import Uglify from 'uglify-js';

export const uglify = async (folder: string, filename: string) => {
  const filenameWithoutExt = filename.split('.').slice(0, -1).join('.');
  const { code, map } = Uglify.minify(await readFile(path.resolve(folder, `${filenameWithoutExt}.js`)), {
    sourceMap: true,
    // comments: true,
  });
  await Promise.all([
    writeFile(path.resolve(folder, `${filenameWithoutExt}.min.js`), code),
    writeFile(path.resolve(folder, `${filenameWithoutExt}.min.js.map`), map),
  ]);
};
