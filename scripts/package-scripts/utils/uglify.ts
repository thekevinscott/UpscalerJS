import fs from 'fs';
import path from 'path';
const Uglify = require('uglify-js');

export const uglify = (folder: string, filename: string) => {
  const filenameWithoutExt = filename.split('.').slice(0, -1).join('.');
  const { code, map } = Uglify.minify(fs.readFileSync(path.resolve(folder, `${filenameWithoutExt}.js`), 'utf-8'), {
    sourceMap: true,
    // comments: true,
  });
  fs.writeFileSync(path.resolve(folder, `${filenameWithoutExt}.min.js`), code, 'utf-8');
  fs.writeFileSync(path.resolve(folder, `${filenameWithoutExt}.min.js.map`), map, 'utf-8');
}
