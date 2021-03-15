import * as tf from '@tensorflow/tfjs';
import { SerializableConstructor } from '@tensorflow/tfjs-core/dist/serialization';
export declare type WarmupSizesByPatchSize = {
    patchSize: number;
    padding?: number;
};
export declare type WarmupSizes = [number, number] | WarmupSizesByPatchSize;
export interface IUpscalerOptions {
    model?: string;
    scale?: number;
    warmupSizes?: WarmupSizes[];
}
export declare type Progress = (amount: number) => void;
export interface IUpscaleOptions {
    output?: 'src' | 'tensor';
    patchSize?: number;
    padding?: number;
    progress?: Progress;
}
export declare type ProcessFn<T extends tf.Tensor> = (t: T) => T;
export interface IModelDefinition {
    url: string;
    scale: number;
    configURL?: string;
    description?: string;
    deprecated?: boolean;
    preprocess?: ProcessFn<tf.Tensor4D>;
    postprocess?: ProcessFn<tf.Tensor3D>;
    customLayers?: SerializableConstructor<tf.layers.Layer>[];
}
export declare type IIntermediaryModelDefinition = Omit<IModelDefinition, 'configURL' | 'url'> & {
    urlPath: string;
};
export declare type Layer = tf.layers.Layer;
