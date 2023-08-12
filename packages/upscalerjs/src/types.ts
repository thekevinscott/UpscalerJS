import { tf, } from './dependencies.generated';
import type { ModelDefinitionObjectOrFn, ModelDefinition, } from '@upscalerjs/core';

export type WarmupSizesByPatchSize = {
  patchSize: number;
  padding?: number;
};
export type NumericWarmupSizes = number;
export interface UpscalerOptions {
  /**
   * Defaults to [`@upscalerjs/default-model`](/models/available/upscaling/default-model)
   */
  model?: ModelDefinitionObjectOrFn;
  warmupSizes?: WarmupSizes;
}

export type WarmupSizes = NumericWarmupSizes | WarmupSizesByPatchSize | (NumericWarmupSizes | WarmupSizesByPatchSize)[];

export type ParsedModelDefinition = ModelDefinition;

export type BASE64 = 'base64';
export type TENSOR = 'tensor';
export type ResultFormat = BASE64 | TENSOR | undefined;
export interface SliceData {
  row: number;
  col: number;
  patchCoordinates: {
    pre: PatchCoordinates;
    post: PatchCoordinates;
  }
}
export type MultiArgStringProgress = (amount: number, slice: string, sliceData: SliceData) => void;
export type MultiArgTensorProgress = (amount: number, slice: tf.Tensor3D, sliceData: SliceData) => void;
export type SingleArgProgress = (amount: number) => void;
export type Progress = SingleArgProgress | MultiArgStringProgress | MultiArgTensorProgress;

interface SharedArgs {
  /**
   * Provides a mechanism to abort the warmup process. [For more, see the guides on cancelling requests](/documentation/guides/browser/usage/cancel).
   */
  signal?: AbortSignal;
  /**
   * If provided, upscaler will await `tf.nextFrame()` on each cycle. This allows enhancement operations to more often release the UI thread, and can make enhancement operations more responsive to abort signals or.
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
   * An optional progress callback if `execute` is called with a `patchSize` argument. [For more, see the guide on progress callbacks](/documentation/guides/browser/usage/progress).
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

export interface ModelPackage {
  model: tf.LayersModel | tf.GraphModel;
  modelDefinition: ParsedModelDefinition;
}

export type YieldedIntermediaryValue = undefined | tf.Tensor4D | tf.Tensor3D | Array<tf.Tensor3D | tf.Tensor4D | undefined>;

/* eslint-disable @typescript-eslint/no-empty-interface */
export interface WarmupArgs extends SharedArgs {}
export type CheckValidEnvironment<T> = (input: T, opts: {
  output?: ResultFormat;
  progressOutput?: ResultFormat;
}) => void;

export type Coordinate = [number, number];

export type PatchCoordinates = {
  origin: Coordinate;
  size: Coordinate;
};

export type Patch = {
  pre: PatchCoordinates;
  post: PatchCoordinates;
};

export type { ProcessFn, } from '@upscalerjs/core';
