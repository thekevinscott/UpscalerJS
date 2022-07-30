import { tf, } from './dependencies.generated';
import type { ModelDefinitionObjectOrFn, ModelDefinition, } from '@upscalerjs/core';

export type WarmupSizesByPatchSize = {
  patchSize: number;
  padding?: number;
};
export type NumericWarmupSizes = [number, number];
export type WarmupSizes = NumericWarmupSizes | WarmupSizesByPatchSize;
export interface UpscalerOptions {
  model?: ModelDefinitionObjectOrFn;
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

export type Layer = tf.layers.Layer;

export { PackageInformation, ProcessFn, } from '@upscalerjs/core';

export interface ModelPackage {
  model: tf.LayersModel;
  modelDefinition: ModelDefinition;
}
