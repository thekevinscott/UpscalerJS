import type { Tensor3D, Tensor4D, } from '@tensorflow/tfjs-core';
import type { LayersModel, layers, } from '@tensorflow/tfjs-layers';
import type { TF, GraphModel, ModelDefinitionObjectOrFn, ModelDefinition, } from '@upscalerjs/core';
export type { ProcessFn, } from '@upscalerjs/core';

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
export type MultiArgTensorProgress = (amount: number, slice: Tensor3D, sliceData: SliceData) => void;
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

export type Layer = layers.Layer;

export interface ModelPackage {
  model: LayersModel | GraphModel;
  modelDefinition: ParsedModelDefinition;
}

export type YieldedIntermediaryValue = undefined | Tensor4D | Tensor3D | Array<Tensor3D | Tensor4D | undefined>;

/* eslint-disable @typescript-eslint/no-empty-interface */
export interface WarmupArgs extends SharedArgs {}
export type CheckValidEnvironment<I> = (input: I, opts: {
  output?: ResultFormat;
  progressOutput?: ResultFormat;
}) => void;
export type GetImageAsTensor<T extends TF, I> = (tf: T, input: I) => Promise<Tensor4D>;
export type TensorAsBase64<T extends TF> = (tf: T, tensor: Tensor3D) => string;
export type LoadModel<T extends TF> = (tf: T, _modelDefinition: Promise<ModelDefinition>) => Promise<ModelPackage>;
export type GetUpscaleOptions = (args?: Omit<UpscaleArgs, 'output' | 'progressOutput'> & {
  output?: unknown;
  progressOutput?: unknown
}) => PrivateUpscaleArgs;

export type Coordinate = [number, number];

export type PatchCoordinates = {
  origin: Coordinate;
  size: Coordinate;
};

export type Patch = {
  pre: PatchCoordinates;
  post: PatchCoordinates;
};

export interface Internals<T extends TF, Input> extends InternalConfig<T, Input> {
  tf: T;
  getUpscaleOptions: GetUpscaleOptions;
  loadModel: LoadModel<T>;
}

export interface InternalConfig<T extends TF, I> {
  checkValidEnvironment: CheckValidEnvironment<I>;
  getImageAsTensor: GetImageAsTensor<T, I>;
  tensorAsBase64: TensorAsBase64<T>;
}
