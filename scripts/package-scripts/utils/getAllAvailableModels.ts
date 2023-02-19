import { readdirSync, lstatSync, readFileSync, existsSync } from 'fs-extra';
import path from 'path';
import { getPackageJSONExports, PackageJSONExport } from './getPackageJSONExports';

const ROOT = path.resolve(__dirname, '../../../');
const MODELS_DIR = path.resolve(ROOT, 'models');
const EXCLUDED = ['dist', 'types', 'node_modules', 'docs', 'esrgan-experiments'];

const jsonParse = (fileName: string) => JSON.parse(readFileSync(fileName, 'utf-8'))

export const getAllAvailableModelPackages = (): Array<string> => readdirSync(MODELS_DIR).filter(file => {
  const modelDir = path.resolve(MODELS_DIR, file);

  return !EXCLUDED.includes(file) && lstatSync(modelDir).isDirectory() && existsSync(path.resolve(modelDir, 'package.json'));
});

export interface AvailableModel {
  export: string;
  esm: string;
  cjs: string;
  umd: string;
  pathName: string | PackageJSONExport;
}

export const getAllAvailableModels = (packageName: string): AvailableModel[] => {
  const modelPackageDir = path.resolve(MODELS_DIR, packageName);
  const umdNames = jsonParse(path.resolve(modelPackageDir, 'umd-names.json'));
  return getPackageJSONExports(modelPackageDir).map(([key, pathName]) => {
    const umdName = umdNames[key];
    if (umdName === undefined) {
      throw new Error(`No UMD name defined for ${key}`);
    }
    const availableModel: AvailableModel = {
      export: key,
      esm: key.substring(2),
      cjs: key.substring(2),
      umd: umdName,
      pathName,
    };
    return availableModel;
  });
};

export const getFilteredModels = ({
  specificModel,
  specificPackage,
  filter = () => true,
  includeExperimental = false,
}: {
  specificPackage?: string;
  specificModel?: string;
  filter?: (packageName: string, model: AvailableModel) => boolean;
  includeExperimental?: boolean;
}) => {
  const filteredPackagesAndModels = getAllAvailableModelPackages().reduce((arr, packageName) => {
    const models = getAllAvailableModels(packageName);
    return arr.concat(models.map(model => {
      return [packageName, model];
    }));
  }, [] as ([string, AvailableModel])[])

  .filter(([packageName, model]) => {
    if (includeExperimental) {
      return true;
    }
    const packageJSON = JSON.parse(readFileSync(path.resolve(MODELS_DIR, packageName, 'package.json'), 'utf-8'));
    const experimental = packageJSON['@upscalerjs']?.['model']?.['experimental'];
    return !experimental;
  })
  .filter(([packageName, model]) => {
    if (specificPackage !== undefined) {
      return packageName === specificPackage;
    }
    return true;
  })
  .filter(([_, model]) => {
    if (specificModel !== undefined) {
      return model.esm === specificModel;
    }
    return true;
  })
  .filter(([packageName, model]) => {
    return filter(packageName, model);
  });
  if (filteredPackagesAndModels.length === 0) {
    const allPackages = getAllAvailableModelPackages().map(packageName => {
      return [
        `- ${packageName}`,
        ...getAllAvailableModels(packageName).map(m => `  - ${m.esm}`),
      ].join('\n');
    });
    throw new Error([
      'No models were found for filter',
      'Available models:',
      ...allPackages,
    ].join('\n'));
  }

  const filteredPackagesAndModelsObj = filteredPackagesAndModels.reduce((obj, [packageName, model]) => ({
    ...obj,
    [packageName]: (obj[packageName] || []).concat([model]),
  }), {} as Record<string, AvailableModel[]>);

  return Object.entries(filteredPackagesAndModelsObj);
};
