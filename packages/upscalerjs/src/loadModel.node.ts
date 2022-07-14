import { tf, } from './dependencies.generated';
import path from 'path';
import type { ModelDefinition, } from "@upscalerjs/core";
import { getModelDefinitionError, isValidModelDefinition, registerCustomLayers, } from './utils';
import { resolver, } from './resolver';

// const ERROR_URL_EXPLICIT_SCALE_REQUIRED =
//   'https://thekevinscott.github.io/UpscalerJS/#/?id=you-must-provide-an-explicit-scale';
// const ERROR_URL_EXPLICIT_SCALE_DISALLOWED =
//   'https://thekevinscott.github.io/UpscalerJS/#/?id=you-are-requesting-the-pretrained-model-but-are-providing-an-explicit-scale';

const DIST_REGEXP = new RegExp('(.*)dist');
export const getModuleFolder = (name: string) => {
  const moduleEntryPoint = resolver(name);
  const matches = moduleEntryPoint.match(DIST_REGEXP);
  if (!matches) {
    throw new Error(`No matches could be found for module entry point ${moduleEntryPoint}`);
  }
  const match = matches.pop();
  if (!match) {
    throw new Error(`No matches could be found for module entry point ${moduleEntryPoint}`);
  }
  return match;
};

export const getModelPath = ({ packageInformation, path: modelPath, }: ModelDefinition): string => {
  if (packageInformation) {
    const moduleFolder = getModuleFolder(packageInformation.name);
    return `file://${path.resolve(moduleFolder, modelPath)}`;
  }
  return modelPath;
};

export const loadModel = async (
  modelDefinition: ModelDefinition | undefined,
): Promise<{
  model: tf.LayersModel;
  modelDefinition: ModelDefinition;
}> => {
  if (isValidModelDefinition(modelDefinition)) {
    registerCustomLayers(modelDefinition);

    const modelPath = getModelPath(modelDefinition);
    const model = await tf.loadLayersModel(modelPath);

    return {
      model,
      modelDefinition,
    };
  } else {
    throw getModelDefinitionError(modelDefinition);
  }
};
