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
export type MultiArgStringProgress = (amount: number, slice: string, row: number, col: number) => void;
export type MultiArgTensorProgress = (amount: number, slice: tf.Tensor3D, row: number, col: number) => void;
export type SingleArgProgress = (amount: number) => void;
export type Progress = SingleArgProgress | MultiArgStringProgress | MultiArgTensorProgress;

interface SharedArgs {
  /**
   * Provides a mechanism to abort the warmup process. [For more, see the guides on cancelling requests](/documentation/guides/browser/usage/cancel).
   */
  signal?: AbortSignal;
  /**
   * If provided, upscaler will await `tf.nextFrame()` on each cycle. This can be helpful if you need to release for the UI thread or wish to be more responsive to abort signals.
   */
  awaitNextFrame?: boolean;
}

export interface UpscaleArgs extends SharedArgs {
  /**
   * Denotes the kind of response UpscalerJS returns - a base64 string representation of the image, or the tensor. In the browser, this defaults to `"base64"` and in Node.js, to `"tensor"`.
   */
  output?: BASE64 | TENSOR;
  /**
   * Optionally specify an image patch size to operate on. [For more, see the guide on patch sizes](/documentation/guides/browser/performance/patch-sizes).
   */
  patchSize?: number;
  /**
   * Optionally specify a patch size padding. [For more, see the guide on patch sizes](/documentation/guides/browser/performance/patch-sizes).
   */
  padding?: number;
  /**
   * An optional progress callback if `upscale` is called with a `patchSize` argument. [For more, see the guide on progress callbacks](/documentation/guides/browser/usage/progress).
   */
  progress?: Progress;
  /**
   * Denotes the kind of response UpscalerJS returns within a `progress` callback.
   */
  progressOutput?: BASE64 | TENSOR;
}

export interface PrivateUpscaleArgs extends Omit<UpscaleArgs, 'output' | 'progressOutput'> {
  output: BASE64 | TENSOR;
  progressOutput: BASE64 | TENSOR;
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
