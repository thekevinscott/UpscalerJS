import * as tf from '@tensorflow/tfjs';
import { IUpscalerOptions } from "./types";
import MODELS, { DEFAULT_MODEL } from './models';

const getModelPath = (model: string = DEFAULT_MODEL) => {
  if (model in MODELS) {
    return MODELS[model].url;
  }

  return model;
};

const loadModel = async (opts: IUpscalerOptions) => {
  return await tf.loadLayersModel(getModelPath(opts.model));
};

export default loadModel;
