import { readdir, exists, readFile, stat } from '@internals/common/fs';
import path from 'path';
import { getPackageJSON, getPackageJSONExports, PackageJSONExport } from './package-json.js';
import { MODELS_DIR } from '@internals/common/constants';
import { Environment } from './types.js';

export const EXCLUDED = ['dist', 'types', 'node_modules', 'docs'];
export const PRIVATE_MODEL_PACKAGE_NAMES = ['pixel-upsampler'];

const isValidModelPackage = async (file: string, includeExperimental: boolean) => {
  const modelDir = path.resolve(MODELS_DIR, file);
  if (EXCLUDED.includes(file) || !(await stat(modelDir)).isDirectory()) {
    return false;
  }

  const packageJSONPath = path.resolve(modelDir, 'package.json');

  if (!(await exists(packageJSONPath))) {
    return false;
  }

  if (includeExperimental === false) {
    const packageJSON = JSON.parse(await readFile(packageJSONPath));
    const experimental = packageJSON['@upscalerjs']?.['model']?.['experimental'];
    if (experimental) {
      return false;
    }
  }

  return true;
};

// export interface PackageAndModel { packageDirectory: string, model: AvailableModel };

const getAllModelPackages = async (includeExperimental = false) => {
  const dirContents = await readdir(MODELS_DIR);
  const filters: boolean[] = await Promise.all(dirContents.map(file => isValidModelPackage(file, includeExperimental)));
  const packageDirectoryNames = dirContents.reduce<string[]>((acc, file, i) => filters[i] ? acc.concat(file) : acc, []);
  if (packageDirectoryNames.length === 0) {
    throw new Error('No valid directories could be found found');
  }
  return packageDirectoryNames.sort();
}

const getAllAvailableModels = async (packageName: string): Promise<AvailableModel[]> => {
  const modelPackageDir = path.resolve(MODELS_DIR, packageName);
  const umdNamesPath = path.resolve(modelPackageDir, 'umd-names.json');
  if (!await exists(umdNamesPath)) {
    throw new Error(`No umd-names.json file found at ${umdNamesPath}`);
  }
  const umdNames = JSON.parse(await readFile(umdNamesPath))
  const packageJSONExports = await getPackageJSONExports(modelPackageDir);
  return packageJSONExports.filter(k => k[0] !== '.').map(([key, value]) => {
    const umdName = umdNames[key];
    if (umdName === undefined) {
      throw new Error(`No UMD name defined for ${packageName}/umd-names.json for ${key}`);
    }
    return {
      key,
      umdName,
      value,
    };
  });
};

const getAllModels = async (packageDirectoryNames: Promise<string[]>) => {
  const modelPackagesAndModels: ModelInformation[] = [];
  await Promise.all((await packageDirectoryNames).map(async packageDirectoryName => {
    if (!packageDirectoryName) {
      throw new Error(`Missing package name in getAllAvailableModelPackagesAndModels`);
    }
    const modelPackageDir = path.resolve(MODELS_DIR, packageDirectoryName);
    const [
      models,
      packageJSON,
    ] = await Promise.all([
      getAllAvailableModels(packageDirectoryName),
      getPackageJSON(modelPackageDir),
    ]);

    const { name: packageName } = packageJSON;
    if (!packageName) {
      throw new Error(`No name defined on package json for folder ${packageDirectoryName}`)
    }

    for (const model of models) {
      modelPackagesAndModels.push({
        modelName: model.key,
        packageName,
        modelUMDName: model.umdName, 
        packageDirectoryName: packageDirectoryName,
        modelExport: model.value,
      });
    }
  }));
  return modelPackagesAndModels;
};

export interface ModelInformation {
  modelName: string;
  packageName: string;
  modelUMDName: string;
  packageDirectoryName: string;
  modelExport: string | PackageJSONExport;
}
export const isValidModelInformation = (model: unknown): model is ModelInformation => !!model && typeof model === 'object' && 'packageDirectoryName' in model;
export const ALL_MODEL_PACKAGE_DIRECTORY_NAMES = getAllModelPackages();
export const ALL_MODELS: Promise<ModelInformation[]> = getAllModels(ALL_MODEL_PACKAGE_DIRECTORY_NAMES);

interface AvailableModel {
  key: string;
  umdName: string;
  value: string | PackageJSONExport;
}

export const getSupportedPlatforms = async (packageName: string, modelName: string): Promise<Environment[]> => {
  if (!packageName) {
    throw new Error('Missing package name')
  }
  const packageJSONPath = path.resolve(MODELS_DIR, packageName);
  const packageJSON = await getPackageJSON(packageJSONPath);
  return packageJSON['@upscalerjs']?.models?.[modelName]?.supportedPlatforms || ['clientside', 'serverside'];
};

const getPackagesAndModelsMatchingEnvironment = async (environment: Environment, packagesAndModels: ModelInformation[]) => {
  const filteredPackagesAndModels: ModelInformation[] = [];
  await Promise.all(packagesAndModels.map(async (modelInformation) => {
    const supportedPlatforms = await getSupportedPlatforms(modelInformation.packageDirectoryName, modelInformation.modelName);
    if (supportedPlatforms.includes(environment)) {
      filteredPackagesAndModels.push(modelInformation);
    }
  }));
  return filteredPackagesAndModels;
};


export const getPackagesAndModelsForEnvironment = async (environment: Environment) => {
  const packagesAndModels = await ALL_MODELS;
  return getPackagesAndModelsMatchingEnvironment(environment, packagesAndModels);
};
