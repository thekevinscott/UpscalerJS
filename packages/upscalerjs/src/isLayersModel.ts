import type { LayersModel, } from '@tensorflow/tfjs-layers';
import type { TF, GraphModel, } from '@upscalerjs/core';

export const isLayersModel = (tf: TF, model: LayersModel | GraphModel): model is LayersModel => model instanceof tf.LayersModel;
