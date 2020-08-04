import * as tf from '@tensorflow/tfjs';
import { IUpscalerOptions, IModelDefinition } from './types';
import MODELS, { DEFAULT_MODEL } from './models';

const ERROR_URL_EXPLICIT_SCALE_REQUIRED = 'https://thekevinscott.github.io/UpscalerJS/#/?id=you-must-provide-an-explicit-scale';
const ERROR_URL_EXPLICIT_SCALE_DISALLOWED = 'https://thekevinscott.github.io/UpscalerJS/#/?id=you-are-requesting-the-pretrained-model-but-are-providing-an-explicit-scale';

export const getModelDefinition = ({
  model = DEFAULT_MODEL,
  scale,
}: IUpscalerOptions = {}): IModelDefinition => {
  if (model in MODELS) {
    const modelDefinition = MODELS[model];
    if (scale) {
      throw new Error([
        `You are requesting the pretrained model ${model} but are providing an explicit scale.`,
        'This is not allowed.',
        `For more details, see ${ERROR_URL_EXPLICIT_SCALE_DISALLOWED}`,
      ].join(' '));
    }
    return modelDefinition;
  }

  if (!scale) {
    throw new Error([
      `If providing a custom model, you must provide an explicit scale.`,
      `For more details, see ${ERROR_URL_EXPLICIT_SCALE_REQUIRED}`,
    ].join(' '));
  }

  return {
    url: model,
    scale,
  };
};

const loadModel = async (
  opts: IUpscalerOptions,
): Promise<{
  model: tf.LayersModel;
  modelDefinition: IModelDefinition;
}> => {
  const modelDefinition = getModelDefinition(opts);
  const model = await tf.loadLayersModel(modelDefinition.url);
  return {
    model,
    modelDefinition,
  };
};

export default loadModel;
