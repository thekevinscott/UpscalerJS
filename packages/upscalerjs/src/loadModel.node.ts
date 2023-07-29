import path from 'path';
import type { ModelDefinition, } from "@upscalerjs/core";
import { loadTfModel, parseModelDefinition, } from './model-utils';
import { resolver, } from './resolver';
import { ParsedModelDefinition, ModelPackage, } from './types';
import {
  ModelDefinitionValidationError,
  isValidModelDefinition,
} from '@upscalerjs/core';
import {
  ERROR_MODEL_DEFINITION_BUG,
  getModelDefinitionError,
} from './errors-and-warnings';

export const getMissingMatchesError = (moduleEntryPoint: string): Error => new Error(
  `No matches could be found for module entry point ${moduleEntryPoint}`
);

const DIST_REGEXP = new RegExp('(.*)dist'); // skipcq: js-0115
export const getModuleFolder = (name: string): string => {
  const moduleEntryPoint = resolver(name);
  const match = moduleEntryPoint.match(DIST_REGEXP)?.pop();
  if (!match) {
    throw getMissingMatchesError(moduleEntryPoint);
  }
  return match;
};

export const getModelPath = ({ _internals: { packageInformation } = {}, path: modelPath, }: ParsedModelDefinition): string => {
  if (packageInformation) {
    const moduleFolder = getModuleFolder(packageInformation.name);
    return `file://${path.resolve(moduleFolder, modelPath)}`;
  }
  return modelPath;
};

export const loadModel = async (
  modelDefinition: ModelDefinition,
): Promise<ModelPackage> => {
  try {
    isValidModelDefinition(modelDefinition);
  } catch(err: unknown) {
    throw err instanceof ModelDefinitionValidationError ? getModelDefinitionError(err.type, modelDefinition) : new Error(ERROR_MODEL_DEFINITION_BUG);
  }

  const parsedModelDefinition = parseModelDefinition(modelDefinition);

  const modelPath = getModelPath(parsedModelDefinition);
  const model = await loadTfModel(modelPath, parsedModelDefinition.modelType);

  return {
    model,
    modelDefinition: parsedModelDefinition,
  };
};
