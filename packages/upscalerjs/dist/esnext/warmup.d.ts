import * as tf from '@tensorflow/tfjs';
import { WarmupSizes, IModelDefinition } from './types';
declare const warmup: (modelPackage: Promise<{
    model: tf.LayersModel;
    modelDefinition: IModelDefinition;
}>, sizes: WarmupSizes[]) => Promise<void>;
export default warmup;
