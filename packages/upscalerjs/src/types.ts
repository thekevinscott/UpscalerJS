import { tf, } from './dependencies.generated';
import { SerializableConstructor, } from '@tensorflow/tfjs-core/dist/serialization';

export type WarmupSizesByPatchSize = {
  patchSize: number;
  padding?: number;
};
export type WarmupSizes = [number, number] | WarmupSizesByPatchSize;
export interface IUpscalerOptions {
  model?: string;
  scale?: number;
  warmupSizes?: WarmupSizes[];
  modelDefinition?: IModelDefinition;
}

export type ProgressSingleArg = (amount: number) => void;
export type ProgressMultiArg = (amount: number, slice?: string | tf.Tensor3D) => void;

export type ReturnType = 'src' | 'tensor';
export interface IUpscaleOptions<Output extends ReturnType, ProgressOutput extends ReturnType>{
  output?: Output;
  patchSize?: number;
  padding?: number;
  progress?: ProgressSingleArg | ProgressMultiArg;
  progressOutput?: ProgressOutput;
}

export type ProcessFn<T extends tf.Tensor> = (t: T) => T;

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

export type IIntermediaryModelDefinition = Omit<
  IModelDefinition,
  'configURL' | 'url'
> & {
  urlPath: string;
};

export type Layer = tf.layers.Layer;
