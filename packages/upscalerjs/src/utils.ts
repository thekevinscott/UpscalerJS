import { tf, } from './dependencies.generated';
import type { Progress, MultiArgProgress, SingleArgProgress, ResultFormat, } from './types';
import type { ModelDefinitionFn, ModelDefinition, ModelDefinitionObjectOrFn, } from '@upscalerjs/core';

export const isString = (pixels: unknown): pixels is string => typeof pixels === 'string';

export function makeIsNDimensionalTensor<T extends tf.Tensor>(rank: number) {
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
export function getModelDefinitionError(modelDefinition?: ModelDefinition) {
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

export const registerCustomLayers = (modelDefinition: ModelDefinition) => {
  if (modelDefinition.customLayers) {
    modelDefinition.customLayers.forEach((layer) => {
      tf.serialization.registerClass(layer);
    });
  }
};

export const isFourDimensionalTensor = makeIsNDimensionalTensor<tf.Tensor4D>(4);
export const isThreeDimensionalTensor = makeIsNDimensionalTensor<tf.Tensor3D>(3);
export const isTensor = (input: unknown): input is tf.Tensor => {
  return input instanceof tf.Tensor;
};

export const warn = (msg: string | string[]) => {
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

export const isAborted = (abortSignal?: AbortSignal) => {
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

export const tensorAsClampedArray = async (tensor: tf.Tensor3D) => {
  const [height, width, ] = tensor.shape;
  const arr = new Uint8ClampedArray(width * height * 4);
  const data = await tensor.data();
  let i = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pos = (y * width + x) * 4;
      arr[pos] = data[i]; // R
      arr[pos + 1] = data[i + 1]; // G
      arr[pos + 2] = data[i + 2]; // B
      arr[pos + 3] = 255; // Alpha
      i += 3;
    }
  }
  return arr;
};
