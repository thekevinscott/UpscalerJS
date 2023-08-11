import fs from 'fs';
import path from 'path';
import { ROOT_DIR } from './utils/constants.js';

const ROOT = ROOT_DIR;
const EXCLUDED = ['node_modules', 'scratch'];
const MAX_DEPTH = 100;

const findAllPackages = (dir: string, excluded: string[] = [], depth = 0): Array<string> => {
  let packages: Array<string> = [];
  if (depth > MAX_DEPTH) {
    throw new Error('Maximum depth reached');
  }
  const files = fs.readdirSync(dir);
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const fullFile = path.resolve(dir, file);
    if (file === 'package.json') {
      const strippedFile = fullFile.split(`${ROOT}/`).pop();
      if (!strippedFile) {
        throw new Error(`Error with file ${fullFile}`);
      }
      packages.push(strippedFile);
    } else if (!EXCLUDED.includes(file) && !excluded.includes(fullFile)) {
      const stat = fs.statSync(fullFile);
      if (stat && stat.isDirectory()) {
        const dirFiles = findAllPackages(fullFile, excluded, depth + 1);
        packages = packages.concat(dirFiles);
      }
    }
  }
  return packages;
};

export default findAllPackages;
