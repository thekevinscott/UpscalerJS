import path from 'path';
import { loadTfModel, parseModelDefinition, } from '../shared/model-utils';
import { resolver, } from './resolver';
import { ParsedModelDefinition, LoadModel, } from '../shared/types';
import type {
  TF,
} from '../../../shared/src/types';
import {
  ERROR_MODEL_DEFINITION_BUG,
} from '../shared/errors-and-warnings';
import { checkModelDefinition, } from '../shared/utils.js';

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
  const { _internals, } = modelConfiguration;
  if (!_internals) {
    // This should never happen. This should have been caught by isValidModelDefinition.
    throw ERROR_MODEL_DEFINITION_BUG('Missing internals');
  }
  const moduleFolder = getModuleFolder(_internals.name);
  return `file://${path.resolve(moduleFolder, _internals.path)}`;
};

export const loadModel: LoadModel<TF> = async (tf, _modelDefinition) => {
  const modelDefinition = await _modelDefinition;

  checkModelDefinition(modelDefinition);

  const parsedModelDefinition = parseModelDefinition(modelDefinition);

  const modelPath = getModelPath(parsedModelDefinition);
  const model = await loadTfModel(tf, modelPath, parsedModelDefinition.modelType);

  return {
    model,
    modelDefinition: parsedModelDefinition,
  };
};
