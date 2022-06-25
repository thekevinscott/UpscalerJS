import { tf, } from './dependencies.generated';
import path from 'path';
import { ModelDefinition, } from './types';
import { getModelDefinitionError, isValidModelDefinition, registerCustomLayers, } from './utils';
import { resolver, } from './resolver';

// const ERROR_URL_EXPLICIT_SCALE_REQUIRED =
//   'https://thekevinscott.github.io/UpscalerJS/#/?id=you-must-provide-an-explicit-scale';
// const ERROR_URL_EXPLICIT_SCALE_DISALLOWED =
//   'https://thekevinscott.github.io/UpscalerJS/#/?id=you-are-requesting-the-pretrained-model-but-are-providing-an-explicit-scale';

// const DEFAULT_MODEL_DEFINITION: ModelDefinition = {
//   url: 'foo',
//   scale: 2,
// };

export const getModuleFolder = (name: string) => {
  const moduleEntryPoint = resolver(name);
  const moduleFolder = moduleEntryPoint.match(`(.*)/${name}`)?.[0];
  if (moduleFolder === undefined) {
    throw new Error(`Cannot find module ${name}`);
  }
  return moduleFolder;
};

export const getModelPath = ({ packageInformation, path: modelPath, }: ModelDefinition): string => {
  if (packageInformation) {
    const moduleFolder = getModuleFolder(packageInformation.name);
    return `file://${path.resolve(moduleFolder, modelPath)}`;
  }
  return modelPath;
};

// const DEFAULT_MODEL_DEFINITION = {
//   path: 'fooey',
//   scale: 4,
// }

export const loadModel = async (
  modelDefinition: ModelDefinition | undefined,
  // modelDefinition: ModelDefinition = DEFAULT_MODEL_DEFINITION,
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
