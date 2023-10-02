import { LayersModel, } from '@tensorflow/tfjs-layers';

export const isLayersModel = (model: unknown): model is LayersModel => model instanceof LayersModel;
