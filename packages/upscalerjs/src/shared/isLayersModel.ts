import type { LayersModel, } from '@tensorflow/tfjs-layers';
import type { TF, GraphModel, } from '../../../shared/src/types';

export const isLayersModel = (tf: TF, model: LayersModel | GraphModel): model is LayersModel => model instanceof tf.LayersModel;
