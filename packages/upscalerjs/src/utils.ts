import { tf, } from './dependencies.generated';
import type { Progress, SingleArgProgress, ResultFormat, MultiArgTensorProgress, } from './types';
import type { ModelDefinitionFn, ModelDefinition, ModelDefinitionObjectOrFn, ProcessFn, } from '@upscalerjs/core';

export class AbortError extends Error {
  message = 'The upscale request received an abort signal';
}

export const isString = (el: unknown): el is string => typeof el === 'string';

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

const ERROR_MISSING_MODEL_DEFINITION_URL =
  'https://upscalerjs.com/documentation/troubleshooting#missing-model';
const ERROR_MISSING_MODEL_DEFINITION_PATH_URL =
  'https://upscalerjs.com/documentation/troubleshooting#missing-model-path';
const ERROR_MISSING_MODEL_DEFINITION_SCALE_URL = 'https://upscalerjs.com/documentation/troubleshooting#missing-model-scale';

export const ERROR_MISSING_MODEL_DEFINITION = [
  'You must provide a model definition as the "model" argument to UpscalerJS.',
  `For more information, see ${ERROR_MISSING_MODEL_DEFINITION_URL}.`,
].join('\n');
export const ERROR_MISSING_MODEL_DEFINITION_PATH = [
  'You must provide a "path" when providing a model definition',
  `For more information, see ${ERROR_MISSING_MODEL_DEFINITION_PATH_URL}.`,
].join('\n');
export const ERROR_MISSING_MODEL_DEFINITION_SCALE = [
  'You must provide a scale for a model definition',
  `For more information, see ${ERROR_MISSING_MODEL_DEFINITION_SCALE_URL}.`,
].join('\n');

export function getModelDefinitionError(modelDefinition?: ModelDefinition): Error {
  if (!modelDefinition) {
    return new Error(ERROR_MISSING_MODEL_DEFINITION);
  }
  if (!modelDefinition.path) {
    return new Error(ERROR_MISSING_MODEL_DEFINITION_PATH);
  }
  if (!modelDefinition.scale) {
    return new Error(ERROR_MISSING_MODEL_DEFINITION_SCALE);
  }

  throw new Error('There is a bug with the upscaler code. Please report this.');
}

export const isValidModelDefinition = (modelDefinition?: ModelDefinition): modelDefinition is ModelDefinition => {
  if (modelDefinition === undefined) {
    return false;
  }
  return Boolean(modelDefinition.path && modelDefinition.scale);
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

export function isProgress(p: undefined | Progress): p is Progress { return p !== undefined && typeof p === 'function'; }
export function isSingleArgProgress(p: Progress): p is SingleArgProgress { return isProgress(p) && p.length <= 1; }
export const isMultiArgTensorProgress = (p: Progress, output: ResultFormat, progressOutput: ResultFormat): p is MultiArgTensorProgress => {
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
  let result: undefined | IteratorResult<T, TReturn>;
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

export const hasValidChannels = (tensor: tf.Tensor): boolean => tensor.shape.slice(-1)[0] === 3;

export function parseUpscaleOutput(key: string, option?: 'base64' | 'src' | 'tensor'): undefined | 'base64' | 'tensor' {
  if (option === 'src') {
    console.warn(`You have provided "src" as an option to ${key}. You should switch this to "base64". "src" is deprecated and will be removed in a future version.`);
    return 'base64';
  }
  return option;
}

// this function disposes of any input tensors
export function processAndDisposeOfTensor<T extends tf.Tensor>(
  tensor: T,
  processFn?: ProcessFn<T>,
): T {
  if (processFn) {
    const processedTensor = tf.tidy(() => processFn(tensor));
    if (!tensor.isDisposed) {
      tensor.dispose();
    }
    return processedTensor;
  }
  return tensor;
}
