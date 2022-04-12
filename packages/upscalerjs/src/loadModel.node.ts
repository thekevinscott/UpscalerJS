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

const loadModel = async (
  modelDefinition?: ModelDefinition,
): Promise<{
  model: tf.LayersModel;
  modelDefinition: ModelDefinition;
}> => {
  if (!modelDefinition) {
    throw new Error('No model definition provided');
  }
  const {
    customLayers,
    packageInformation,
  } = modelDefinition;
  if (customLayers) {
    customLayers.forEach((layer) => {
      tf.serialization.registerClass(layer);
    });
  }
  if (!packageInformation) {
    throw new Error('No package information')
  }

  const moduleEntryPoint = require.resolve(packageInformation.name);
  const moduleFolder = moduleEntryPoint.match(`(.*)/${packageInformation.name}`)?.[0];
  if (moduleFolder === undefined) {
    throw new Error(`Cannot find module ${name}`);
  }
  const modelPath = `file://${path.resolve(moduleFolder, modelDefinition.path)}`;
  console.log('modelPath', modelPath)
  const model = await tf.loadLayersModel(modelPath);

  return {
    model,
    modelDefinition,
  };
};

export default loadModel;
