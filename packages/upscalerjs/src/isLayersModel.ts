import { LayersModel, } from '@tensorflow/tfjs-layers';
import { GraphModel, } from '@upscalerjs/core';

export const isLayersModel = (model: LayersModel | GraphModel): model is LayersModel => model instanceof LayersModel;
