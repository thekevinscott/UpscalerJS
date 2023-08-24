import { MODELS_DIR } from '@internals/common/constants';
import { readdir } from '@internals/common/fs';
import path from 'path';

const isString = (model: unknown): model is string => typeof model === 'string';

export const validateModels = async (_models: unknown[]) => {
  const modelPackageDirectoryNames: string[] = [];
  await Promise.all(_models.map(async modelPackageDirectoryName => {
    if (!isString(modelPackageDirectoryName)) {
      throw new Error(`Invalid model argument provided: ${JSON.stringify(modelPackageDirectoryName)}`)
    }
    const modelsFolder = path.resolve(MODELS_DIR, modelPackageDirectoryName, 'models');
    const modelFiles = await readdir(modelsFolder);
    if (modelFiles.length === 0) {
      throw new Error(`No model files found in folder ${modelsFolder}. Did you call dvc pull for ${modelPackageDirectoryName}?`);
    }
    modelPackageDirectoryNames.push(modelPackageDirectoryName);
  }));

  return modelPackageDirectoryNames;
};

