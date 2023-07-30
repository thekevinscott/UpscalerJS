import path from 'path';
import type { ModelDefinition, } from "@upscalerjs/core";
import { loadTfModel, parseModelDefinition, } from './model-utils';
import { resolver, } from './resolver';
import { ParsedModelDefinition, ModelPackage, } from './types';
import {
  isValidModelDefinition,
} from '@upscalerjs/core';
import {
  ERROR_MODEL_DEFINITION_BUG,
  getModelDefinitionError,
} from './errors-and-warnings';
import { errIsModelDefinitionValidationError } from 'utils';

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

export const getModelPath = (modelConfiguration: ParsedModelDefinition): string => {
  if (modelConfiguration.path) {
    return modelConfiguration.path;
  }
  const moduleFolder = getModuleFolder(modelConfiguration._internals.name);
  return `file://${path.resolve(moduleFolder, modelConfiguration._internals.path)}`;
};

export const loadModel = async (
  _modelDefinition: Promise<ModelDefinition>,
): Promise<ModelPackage> => {
  const modelDefinition = await _modelDefinition;
  try {
    isValidModelDefinition(modelDefinition);
  } catch(err: unknown) {
    if (errIsModelDefinitionValidationError(err)) {
      throw getModelDefinitionError(err.type, modelDefinition);
    }
    throw new Error(ERROR_MODEL_DEFINITION_BUG);
  }

  const parsedModelDefinition = parseModelDefinition(modelDefinition);

  const modelPath = getModelPath(parsedModelDefinition);
  const model = await loadTfModel(modelPath, parsedModelDefinition.modelType);

  return {
    model,
    modelDefinition: parsedModelDefinition,
  };
};
