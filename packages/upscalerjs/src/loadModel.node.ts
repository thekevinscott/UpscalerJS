import { tf, } from './dependencies.generated';
import path from 'path';
import { ModelDefinition, } from './types';
// import MODELS, { DEFAULT_MODEL, } from './models';
// import { warn, } from './utils';

// const ERROR_URL_EXPLICIT_SCALE_REQUIRED =
//   'https://thekevinscott.github.io/UpscalerJS/#/?id=you-must-provide-an-explicit-scale';
// const ERROR_URL_EXPLICIT_SCALE_DISALLOWED =
//   'https://thekevinscott.github.io/UpscalerJS/#/?id=you-are-requesting-the-pretrained-model-but-are-providing-an-explicit-scale';

// const DEFAULT_MODEL_DEFINITION: ModelDefinition = {
//   url: 'foo',
//   scale: 2,
// };

const getModuleFolder = (name: string) => {
  const moduleEntryPoint = require.resolve(name);
  const moduleFolder = moduleEntryPoint.match(`(.*)/${name}`)?.[0];
  if (moduleFolder === undefined) {
    throw new Error(`Cannot find module ${name}`);
  }
  return moduleFolder;
};

const getModelPath = ({ packageInformation, path: modelPath, }: ModelDefinition): string => {
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

const loadModel = async (
  modelDefinition?: ModelDefinition,
  // modelDefinition: ModelDefinition = DEFAULT_MODEL_DEFINITION,
): Promise<{
  model: tf.LayersModel;
  modelDefinition: ModelDefinition;
}> => {
  if (!modelDefinition) {
    throw new Error('Model definition');
  }
  if (!modelDefinition.path) {
    throw new Error('No model path provided');
  }
  if (!modelDefinition.scale) {
    throw new Error('No model scale provided');
  }
  const {
    customLayers,
  } = modelDefinition;
  if (customLayers) {
    customLayers.forEach((layer) => {
      tf.serialization.registerClass(layer);
    });
  }

  const modelPath = getModelPath(modelDefinition);
  const model = await tf.loadLayersModel(modelPath);

  return {
    model,
    modelDefinition,
  };
};

export default loadModel;
