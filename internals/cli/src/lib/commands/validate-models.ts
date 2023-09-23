import { MODELS_DIR } from '@internals/common/constants';
import { exists, readdir } from '@internals/common/fs';
import path from 'path';

const isString = (model: unknown): model is string => typeof model === 'string';
const hasModelFiles = async (modelsFolder: string) => {
  if (!await exists(modelsFolder)) {
    return false;
  }
  const modelFiles = await readdir(modelsFolder);
  return modelFiles.length > 0;
};

export const validateModels = async (_models: unknown[], { validateModelsFolder }: { validateModelsFolder?: boolean } = {}) => {
  const modelPackageDirectoryNames: string[] = [];
  await Promise.all(_models.map(async modelPackageDirectoryName => {
    if (!isString(modelPackageDirectoryName)) {
      throw new Error(`Invalid model argument provided: ${JSON.stringify(modelPackageDirectoryName)}`)
    }
    const modelPackageDirectory = path.resolve(MODELS_DIR, modelPackageDirectoryName);
    if (!await exists(modelPackageDirectory)) {
      throw new Error(`Model directory does not exist: ${modelPackageDirectoryName}`)
    }
    if (validateModelsFolder) {
      const modelsFolder = path.resolve(modelPackageDirectory, 'models');
      if (!await hasModelFiles(modelsFolder)) {
        throw new Error(`No model files found in folder ${modelsFolder}. Did you call dvc pull for ${modelPackageDirectoryName}?`);
      }
    }
    modelPackageDirectoryNames.push(modelPackageDirectoryName);
  }));

  return modelPackageDirectoryNames;
};
