import * as tf from '@tensorflow/tfjs';
import { IUpscalerOptions, IUpscaleOptions, WarmupSizes, IModelDefinition } from './types';
declare class Upscaler {
    _opts: IUpscalerOptions;
    _model: Promise<{
        model: tf.LayersModel;
        modelDefinition: IModelDefinition;
    }>;
    constructor(opts?: IUpscalerOptions);
    getModel: () => Promise<{
        model: tf.LayersModel;
        modelDefinition: IModelDefinition;
    }>;
    warmup: (warmupSizes: WarmupSizes[]) => Promise<void>;
    upscale: (image: string | HTMLImageElement | tf.Tensor3D, options?: IUpscaleOptions) => Promise<string | tf.Tensor<tf.Rank>>;
    getModelDefinitions: () => Promise<{
        [index: string]: IModelDefinition;
    }>;
}
export default Upscaler;
