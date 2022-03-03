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

export type ReturnType = 'src' | 'tensor' | undefined;
export type UpscaleResponse<O extends ReturnType> = O extends 'src' ? string : tf.Tensor3D;
export type ProgressResponse<O extends ReturnType = 'src', PO extends ReturnType = undefined> = 
  PO extends 'src' ? 
    'src' : 
    PO extends 'tensor' ? 
      'tensor' :
      O extends 'tensor' ?
        'tensor' :
        'src';

export type MultiArgProgress<O extends ReturnType = 'src'> = (amount: number, slice: UpscaleResponse<O>) => void;
export type SingleArgProgress = (amount: number) => void;
export type Progress<O extends ReturnType = 'src', PO extends ReturnType = undefined> = undefined | SingleArgProgress | MultiArgProgress<ProgressResponse<O, PO>>;
export interface IUpscaleOptions<P extends Progress<O, PO>, O extends ReturnType = 'src', PO extends ReturnType = undefined>{
  output?: O;
  patchSize?: number;
  padding?: number;
  progress?: P;
  progressOutput?: PO;
  signal?: AbortSignal;
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
