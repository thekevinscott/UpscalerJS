import * as tf from '@tensorflow/tfjs';
import { IUpscalerOptions } from "./types";

const getModelPath = (model?: string) => {
  if (model) {
    return model;
  }

  return 'div2k-300-2x';
};

const loadModel = async (opts: IUpscalerOptions) => {
  return await tf.loadLayersModel(getModelPath(opts.model));
};

export default loadModel;
