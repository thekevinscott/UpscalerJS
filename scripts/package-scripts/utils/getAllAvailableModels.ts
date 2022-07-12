import fs from 'fs';
import path from 'path';
import { getPackageJSONExports } from './getPackageJSONExports';

const ROOT = path.resolve(__dirname, '../../../');
const MODELS_DIR = path.resolve(ROOT, 'models');

const jsonParse = (fileName: string) => JSON.parse(fs.readFileSync(fileName, 'utf-8'))

export const getAllAvailableModelPackages = (): Array<string> => fs.readdirSync(MODELS_DIR).filter(file => {
  return !['dist', 'types', 'node_modules'].includes(file) && fs.lstatSync(path.resolve(MODELS_DIR, file)).isDirectory();
});

export const getAllAvailableModels = (model: string) => {
  const modelDir = path.resolve(MODELS_DIR, model);
  const umdNames = jsonParse(path.resolve(modelDir, 'umd-names.json'));
  return getPackageJSONExports(modelDir).map(key => {
    const umdName = umdNames[key];
    if (umdName === undefined) {
      throw new Error(`No UMD name defined for ${key}`);
    }
    return {
      export: key,
      esm: key.substring(2),
      umd: umdName,
    };
  });
};
