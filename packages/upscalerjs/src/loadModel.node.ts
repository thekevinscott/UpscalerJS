import path from 'path';
import type { ParsedModelDefinition, ModelDefinition, } from "@upscalerjs/core";
import { ERROR_MODEL_DEFINITION_BUG, getModelDefinitionError, loadTfModel, parseModelDefinition, } from './utils';
import { resolver, } from './resolver';
import { ModelPackage, } from './types';
import {
  ModelDefinitionValidationError,
  isValidModelDefinition,
} from '@upscalerjs/core';

// const ERROR_URL_EXPLICIT_SCALE_REQUIRED =
//   'https://thekevinscott.github.io/UpscalerJS/#/?id=you-must-provide-an-explicit-scale';
// const ERROR_URL_EXPLICIT_SCALE_DISALLOWED =
//   'https://thekevinscott.github.io/UpscalerJS/#/?id=you-are-requesting-the-pretrained-model-but-are-providing-an-explicit-scale';

export const getMissingMatchesError = (moduleEntryPoint: string): Error => new Error(
  `No matches could be found for module entry point ${moduleEntryPoint}`
);

const DIST_REGEXP = new RegExp('(.*)dist');
export const getModuleFolder = (name: string): string => {
  const moduleEntryPoint = resolver(name);
  const match = moduleEntryPoint.match(DIST_REGEXP)?.pop();
  if (!match) {
    throw getMissingMatchesError(moduleEntryPoint);
  }
  return match;
};

export const getModelPath = ({ packageInformation, path: modelPath, }: ParsedModelDefinition): string => {
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
    modelDefinition,
  };
};
