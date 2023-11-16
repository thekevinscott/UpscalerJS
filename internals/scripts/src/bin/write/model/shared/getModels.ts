import path from 'path';
import { exists, readdir, stat } from '@internals/common/fs';
import { MODELS_DIR } from '@internals/common/constants';
import { warn } from '@internals/common/logger';
import { parseArgs } from "node:util";

const isDirectory = async (path: string) => (await stat(path)).isDirectory();

const isValidModel = async (modelDirectoryName: string) => {
  const modelDirectoryPath = path.resolve(MODELS_DIR, modelDirectoryName);
  return await exists(modelDirectoryPath) && await isDirectory(modelDirectoryPath);
};

const getModelDirectories = async () => {
  const modelDirectories: string[] = [];
  for (const modelDirectoryName of await readdir(MODELS_DIR)) {
    if (await isDirectory(path.resolve(MODELS_DIR, modelDirectoryName))) {
      modelDirectories.push(modelDirectoryName);
    }
  };
  return modelDirectories;
}

const expandModel = async (model: string): Promise<string[]> => {
  if (model.includes('*')) {
    const modelNameMatch = model.split('*')[0];
    const models: string[] = [];
    for (const modelDirectoryName of await getModelDirectories()) {
      if (modelDirectoryName.startsWith(modelNameMatch)) {
        models.push(modelDirectoryName);
      }
    }
    return models;
  }
  return [model];
};

export const getModels = async (): Promise<string[]> => {
  const {
    positionals: models,
  } = parseArgs({
    allowPositionals: true,
  });

  const validModels = new Set<string>();
  for (const modelName of models) {
    for (const model of await expandModel(modelName)) {
      if (await isValidModel(model)) {
        validModels.add(model);
      } else {
        warn(`Invalid model: ${model}`);
      }
    }
  };

  return Array.from(validModels);
}
