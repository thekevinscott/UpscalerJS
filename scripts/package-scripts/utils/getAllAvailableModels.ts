import { readdirSync, lstatSync, readFileSync, existsSync } from 'fs-extra';
import path from 'path';
import { getPackageJSONExports } from './getPackageJSONExports';

const ROOT = path.resolve(__dirname, '../../../');
const MODELS_DIR = path.resolve(ROOT, 'models');
const EXCLUDED = ['dist', 'types', 'node_modules', 'docs'];

const jsonParse = (fileName: string) => JSON.parse(readFileSync(fileName, 'utf-8'))

export const getAllAvailableModelPackages = (): Array<string> => readdirSync(MODELS_DIR).filter(file => {
  const modelDir = path.resolve(MODELS_DIR, file);

  return !EXCLUDED.includes(file) && lstatSync(modelDir).isDirectory() && existsSync(path.resolve(modelDir, 'package.json'));
});

export const getAllAvailableModels = (packageName: string) => {
  const modelPackageDir = path.resolve(MODELS_DIR, packageName);
  const umdNames = jsonParse(path.resolve(modelPackageDir, 'umd-names.json'));
  return getPackageJSONExports(modelPackageDir).map(key => {
    const umdName = umdNames[key];
    if (umdName === undefined) {
      throw new Error(`No UMD name defined for ${key}`);
    }
    return {
      export: key,
      esm: key.substring(2),
      cjs: key.substring(2),
      umd: umdName,
    };
  });
};
