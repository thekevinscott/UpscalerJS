import { tf, } from './dependencies.generated';
// import { SerializableConstructor, } from '@tensorflow/tfjs-core/dist/serialization';

export type WarmupSizesByPatchSize = {
  patchSize: number;
  padding?: number;
};
export type WarmupSizes = [number, number] | WarmupSizesByPatchSize;
export interface UpscalerOptions {
  model?: ModelDefinition;
  warmupSizes?: WarmupSizes[];
}

export type ResultFormat = 'src' | 'tensor' | undefined;
export type UpscaleResponse<O extends ResultFormat> = O extends 'src' ? string : tf.Tensor3D;
export type ProgressResponse<O extends ResultFormat = 'src', PO extends ResultFormat = undefined> = 
  PO extends 'src' ? 
    'src' : 
    PO extends 'tensor' ? 
      'tensor' :
      O extends 'tensor' ?
        'tensor' :
        'src';

export type MultiArgProgress<O extends ResultFormat = 'src'> = (amount: number, slice: UpscaleResponse<O>) => void;
export type SingleArgProgress = (amount: number) => void;
export type Progress<O extends ResultFormat = 'src', PO extends ResultFormat = undefined> = undefined | SingleArgProgress | MultiArgProgress<ProgressResponse<O, PO>>;
export interface UpscaleArgs<P extends Progress<O, PO>, O extends ResultFormat = 'src', PO extends ResultFormat = undefined>{
  output?: O;
  patchSize?: number;
  padding?: number;
  progress?: P;
  progressOutput?: PO;
  signal?: AbortSignal;
}

export type ProcessFn<T extends tf.Tensor> = (t: T) => T;
export interface PackageInformation {
  name: string;
  version: string;
}

type CustomLayer = Parameters<typeof tf.serialization.registerClass>[0];
export interface ModelDefinition {
  path: string;
  scale: 2 | 3 | 4;
  channels?: 3;
  packageInformation?: PackageInformation;
  preprocess?: ProcessFn<tf.Tensor4D>;
  postprocess?: ProcessFn<tf.Tensor3D>;
  // customLayers?: SerializableConstructor<tf.layers.Layer>[];
  customLayers?: CustomLayer[];

  /* eslint-disable @typescript-eslint/no-explicit-any */
  meta?: Record<string, any>;
}

export type Layer = tf.layers.Layer;
