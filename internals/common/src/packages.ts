// import fsExtra from 'fs-extra';
// import path from 'path';
// import { ROOT_DIR } from './constants.js';

// const EXCLUDED = ['node_modules', 'scratch'];
// const MAX_DEPTH = 100;

export const findAllPackages = async (dir: string, excluded: string[] = [], depth = 0): Promise<Array<string>> => {
  throw new Error('is this in use')
  // let packages: Array<string> = [];
  // if (depth > MAX_DEPTH) {
  //   throw new Error('Maximum depth reached');
  // }
  // const files = await readdir(dir);
  // for (let i = 0; i < files.length; i++) {
  //   const file = files[i];
  //   const fullFile = path.resolve(dir, file);
  //   if (file === 'package.json') {
  //     const strippedFile = fullFile.split(`${ROOT_DIR}/`).pop();
  //     if (!strippedFile) {
  //       throw new Error(`Error with file ${fullFile}`);
  //     }
  //     packages.push(strippedFile);
  //   } else if (!EXCLUDED.includes(file) && !excluded.includes(fullFile)) {
  //     const stats = await stat(fullFile);
  //     if (stats.isDirectory()) {
  //       const dirFiles = await findAllPackages(fullFile, excluded, depth + 1);
  //       packages = packages.concat(dirFiles);
  //     }
  //   }
  // }
  // return packages;
};
