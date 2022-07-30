import { tf, } from './dependencies.generated';
import type { Progress, MultiArgProgress, SingleArgProgress, ResultFormat, } from './types';
import type { ModelDefinitionFn, ModelDefinition, ModelDefinitionObjectOrFn, } from '@upscalerjs/core';

export const isString = (pixels: unknown): pixels is string => typeof pixels === 'string';

type IsTensor<T extends tf.Tensor> = (pixels: tf.Tensor) => pixels is T;
export function makeIsNDimensionalTensor<T extends tf.Tensor>(rank: number): IsTensor<T> {
  function fn(pixels: tf.Tensor): pixels is T {
    try {
      return pixels.shape.length === rank;
    } catch (err) { }
    return false;
  }

  return fn;
}

export const MISSING_MODEL_DEFINITION_ERROR = new Error('You must provide a model definition');
export const MISSING_MODEL_DEFINITION_PATH_ERROR = new Error('You must provide a path for a model definition');
export const MISSING_MODEL_DEFINITION_SCALE_ERROR = new Error('You must provide a scale for a model definition');
export const LOGICAL_ERROR = new Error('There is a bug with the upscaler code. Please report this.');
export function getModelDefinitionError(modelDefinition?: ModelDefinition): Error {
  if (!modelDefinition) {
    return MISSING_MODEL_DEFINITION_ERROR;
  }
  if (!modelDefinition.path) {
    return MISSING_MODEL_DEFINITION_PATH_ERROR;
  }
  if (!modelDefinition.scale) {
    return MISSING_MODEL_DEFINITION_SCALE_ERROR;
  }
  return LOGICAL_ERROR;
}

export const isValidModelDefinition = (modelDefinition?: ModelDefinition): modelDefinition is ModelDefinition => {
  if (modelDefinition === undefined) {
    return false;
  }
  return !!(modelDefinition.path && modelDefinition.scale);
};

export const registerCustomLayers = (modelDefinition: ModelDefinition): void => {
  if (modelDefinition.customLayers) {
    modelDefinition.customLayers.forEach((layer) => {
      tf.serialization.registerClass(layer);
    });
  }
};

export const isFourDimensionalTensor = makeIsNDimensionalTensor<tf.Tensor4D>(4);
export const isThreeDimensionalTensor = makeIsNDimensionalTensor<tf.Tensor3D>(3);
export const isTensor = (input: unknown): input is tf.Tensor => input instanceof tf.Tensor;

export const warn = (msg: string | string[]): void => {
  console.warn(Array.isArray(msg) ? msg.join('\n') : msg);// skipcq: JS-0002
};

export function isProgress<O extends ResultFormat = 'src', PO extends ResultFormat = undefined>(p: undefined | Progress<ResultFormat, ResultFormat>): p is Exclude<Progress<O, PO>, undefined> { return p !== undefined && typeof p === 'function'; }
export function isSingleArgProgress(p: Progress<ResultFormat, ResultFormat>): p is SingleArgProgress { return isProgress(p) && p.length <= 1; }
export const isMultiArgTensorProgress = (p: Progress<ResultFormat, ResultFormat>, output: ResultFormat, progressOutput: ResultFormat): p is MultiArgProgress<'tensor'> => {
  if (!isProgress(p) || p.length <= 1) {
    return false;
  }
  return progressOutput === undefined && output === 'tensor' || progressOutput === 'tensor';
};

export const isAborted = (abortSignal?: AbortSignal): boolean => {
  if (abortSignal) {
    return abortSignal.aborted;
  }
  return false;
};

type PostNext<T = unknown> = ((value: T) => (void | Promise<void>));
/* eslint-disable @typescript-eslint/no-explicit-any */
export async function wrapGenerator<T = unknown, TReturn = any, TNext = unknown>(
  gen: Generator<T, TReturn, TNext> | AsyncGenerator<T, TReturn, TNext>, 
  postNext?: PostNext<T>
): Promise<TReturn> {
  let result: undefined | IteratorResult<T, TReturn> = undefined;
  for (result = await gen.next(); !result.done; result = await gen.next()) {
    if (postNext) {
      await postNext(result.value);
    }
  }
  return result.value;
}

export function isModelDefinitionFn (modelDefinition: ModelDefinitionObjectOrFn): modelDefinition is ModelDefinitionFn { return typeof modelDefinition === 'function'; }

export const tensorAsClampedArray = (tensor: tf.Tensor3D): Uint8Array | Float32Array | Int32Array => tf.tidy(() => {
  const [height, width,] = tensor.shape;
  const fill = tf.fill([height, width,], 255).expandDims(2);
  return tensor.clipByValue(0, 255).concat([fill,], 2).dataSync();
});

export const getModel = (modelDefinition: ModelDefinitionObjectOrFn): ModelDefinition => {
  /* eslint-disable @typescript-eslint/no-unsafe-call */
  /* eslint-disable @typescript-eslint/no-unsafe-return */
  return isModelDefinitionFn(modelDefinition) ? modelDefinition(tf) : modelDefinition;
};
