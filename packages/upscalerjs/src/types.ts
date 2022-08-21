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

export type BASE64 = 'base64';
export type TENSOR = 'tensor';
export type ResultFormat = BASE64 | TENSOR | undefined;
export type UpscaleResponse<O extends ResultFormat> = O extends BASE64 ? string : tf.Tensor3D;
export type ProgressResponse<O extends ResultFormat = BASE64, PO extends ResultFormat = undefined> = 
  PO extends BASE64 ? 
    BASE64 : 
    PO extends TENSOR ? 
      TENSOR :
      O extends TENSOR ?
        TENSOR :
        BASE64;

export type MultiArgProgress<O extends ResultFormat = BASE64> = (amount: number, slice: UpscaleResponse<O>, row: number, col: number) => void;
export type SingleArgProgress = (amount: number) => void;
export type Progress<O extends ResultFormat = BASE64, PO extends ResultFormat = undefined> = undefined | SingleArgProgress | MultiArgProgress<ProgressResponse<O, PO>>;
export interface UpscaleArgs<P extends Progress<O, PO>, O extends ResultFormat = BASE64, PO extends ResultFormat = undefined>{
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

// TODO: Remove this in favor of UpscaleArgs. This is to deprecate the 'src' option for output.
export interface TempUpscaleArgs<P extends Progress<O, PO>, O extends ResultFormat = 'base64', PO extends ResultFormat = undefined> {
  output?: O | 'src';
  progressOutput?: PO | 'src';
  patchSize?: number;
  padding?: number;
  progress?: P;
  signal?: AbortSignal;
}
