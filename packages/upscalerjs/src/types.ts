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
   * [Provides a mechanism to abort the warmup process](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal).
   */
  signal?: AbortSignal;
  /**
   * If provided, upscaler will await `tf.nextFrame()` on each cycle. This can be helpful if you need to release for the UI thread or wish to be more responsive to abort signals.
   */
  awaitNextFrame?: boolean;
}

export interface UpscaleArgs extends SharedArgs {
  output: BASE64 | TENSOR;
  patchSize?: number;
  padding?: number;
  progress?: Progress;
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
