import path from 'path';
import { ALL_MODEL_PACKAGE_DIRECTORY_NAMES, } from "@internals/common/models";
import { MODELS_DIR, UPSCALER_DIR, } from '@internals/common/constants';
import { getPackageJSON, } from '@internals/common/package-json';
import { RegistryPackage, } from './types.js';

export const getPackagesForRegistry = async (): Promise<RegistryPackage[]> => {
  const modelPackageDirectorynames = await ALL_MODEL_PACKAGE_DIRECTORY_NAMES;
  const MODEL_PACKAGES = await Promise.all(modelPackageDirectorynames.map(async packageDirectoryName => {
    const directory = path.resolve(MODELS_DIR, packageDirectoryName);
    const { name, } = await getPackageJSON(directory);
    if (!name) {
      throw new Error(`Package name is not defined for ${directory}`);
    }
    return {
      name,
      directory,
      folderName: packageDirectoryName,
    };
  }));

  const modelPackages: RegistryPackage[] = await MODEL_PACKAGES;
  return [
    ...modelPackages,
    { name: 'upscaler', directory: UPSCALER_DIR, },
  ];
};
