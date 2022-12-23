import { tf, } from './dependencies.generated';
import type { ModelDefinitionObjectOrFn, ModelDefinition, } from '@upscalerjs/core';

export type WarmupSizesByPatchSize = {
  patchSize: number;
  padding?: number;
};
export type NumericWarmupSizes = [number, number];
export type WarmupSizes = NumericWarmupSizes | WarmupSizesByPatchSize;
export interface UpscalerOptions {
  /**
   * Defaults to [`@upscalerjs/default-model`](/models/available/default-model)
   */
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

interface SharedArgs {
  /**
   * [Provides a mechanism to abort the warmup process](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal).
   */
  signal?: AbortSignal;
  /**
   * If provided, upscaler will await `tf.nextFrame()` on each cycle. This can be helpful if you need to release for the UI thread or wish to be more responsive to abort signals.
   */
  awaitNextFrame?: boolean;
}

export interface PrivateUpscaleArgs<P extends Progress<O, PO>, O extends ResultFormat = BASE64, PO extends ResultFormat = undefined> extends SharedArgs {
  output?: O;
  patchSize?: number;
  padding?: number;
  progress?: P;
  progressOutput?: PO;
}

export interface PublicUpscaleArgs<P extends Progress<O, PO>, O extends ResultFormat = BASE64, PO extends ResultFormat = undefined> extends Omit<PrivateUpscaleArgs<P, O, PO>, 'output'> {
  output?: O;
}

export type Layer = tf.layers.Layer;

export type { PackageInformation, ProcessFn, } from '@upscalerjs/core';

export interface ModelPackage {
  model: tf.LayersModel;
  modelDefinition: ModelDefinition;
}

export type YieldedIntermediaryValue = undefined | tf.Tensor4D | tf.Tensor3D | Array<tf.Tensor3D | tf.Tensor4D | undefined>;

/* eslint-disable @typescript-eslint/no-empty-interface */
export interface WarmupArgs extends SharedArgs {}
