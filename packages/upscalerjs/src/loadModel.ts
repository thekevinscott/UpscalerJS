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
  if (modelDefinition.customLayers) {
    modelDefinition.customLayers.forEach((layer) => {
      tf.serialization.registerClass(layer);
    });
  }

  // let packagePath = path.dirname(require.resolve("moduleName/package.json"));
  // console.log('ppackagePath', packagePath)
  const url = `file://${path.resolve('node_modules', modelDefinition.url)}`;
  const model = await tf.loadLayersModel(url);

  return {
    model,
    modelDefinition,
  };
};

export default loadModel;
