import { tf, } from './dependencies.generated';
import type { Progress, SingleArgProgress, ResultFormat, MultiArgTensorProgress, } from './types';
import { ModelDefinitionFn, ModelDefinition, ModelDefinitionObjectOrFn, ProcessFn, ModelType, isValidModelType, } from '@upscalerjs/core';

export class AbortError extends Error {
  message = 'The upscale request received an abort signal';
}

const ERROR_MISSING_MODEL_DEFINITION_PATH_URL =
  'https://upscalerjs.com/documentation/troubleshooting#missing-model-path';
const ERROR_MISSING_MODEL_DEFINITION_SCALE_URL = 'https://upscalerjs.com/documentation/troubleshooting#missing-model-scale';
const ERROR_INVALID_MODEL_TYPE_URL = 'https://upscalerjs.com/documentation/troubleshooting#invalid-model-type';

export const ERROR_MISSING_MODEL_DEFINITION_PATH = [
  'You must provide a "path" when providing a model definition',
  `For more information, see ${ERROR_MISSING_MODEL_DEFINITION_PATH_URL}.`,
].join('\n');
export const ERROR_MISSING_MODEL_DEFINITION_SCALE = [
  'You must provide a "scale" for a model definition',
  `For more information, see ${ERROR_MISSING_MODEL_DEFINITION_SCALE_URL}.`,
].join('\n');
export const ERROR_INVALID_MODEL_TYPE = (modelType: unknown) => ([
  `You've provided an invalid model type: ${JSON.stringify(modelType)}. Accepted types are "layers" and "graph".`,
  `For more information, see ${ERROR_INVALID_MODEL_TYPE_URL}.`,
].join('\n'));
export const ERROR_MODEL_DEFINITION_BUG = 'There is a bug with the upscaler code. Please report this.';

export function getModelDefinitionError(modelDefinition: ModelDefinition): Error {
  if (!modelDefinition.path) {
    return new Error(ERROR_MISSING_MODEL_DEFINITION_PATH);
  }
  if (!modelDefinition.scale) {
    return new Error(ERROR_MISSING_MODEL_DEFINITION_SCALE);
  }
  if (!isValidModelType(modelDefinition.modelType || 'layers')) {
    return new Error(ERROR_INVALID_MODEL_TYPE(modelDefinition.modelType));
  }

  return new Error(ERROR_MODEL_DEFINITION_BUG);
}

export const registerCustomLayers = (modelDefinition: ModelDefinition): void => {
  if (modelDefinition.customLayers) {
    modelDefinition.customLayers.forEach((layer) => {
      tf.serialization.registerClass(layer);
    });
  }

  if (modelDefinition.customOps) {
    modelDefinition.customOps.forEach(({ name, op, }) => {
      tf.registerOp(name, op);
    });
  }
};

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

export function parseUpscaleOutput(key: string, option?: 'base64' | 'src' | 'tensor'): undefined | 'base64' | 'tensor' {
  if (option === 'src') {
    console.warn(`You have provided "src" as an option to ${key}. You should switch this to "base64". "src" is deprecated and will be removed in a future version.`);
    return 'base64';
  }
  return option;
}

function nonNullable<T>(value: T): value is NonNullable<T> {
  return value !== null && value !== undefined;
}

// this function disposes of any input tensors
export function processAndDisposeOfTensor<T extends tf.Tensor>(
  tensor: T,
  ..._processFns: (ProcessFn<T> | undefined)[]
): T {
  const processFns: ProcessFn<T>[] = _processFns.filter(nonNullable);

  if (processFns.length) {
    const processedTensor = tf.tidy(() => processFns.reduce((reducedTensor, processFn) => processFn(reducedTensor), tensor));
    if (!tensor.isDisposed) {
      tensor.dispose();
    }
    return processedTensor;
  }
  return tensor;
}

export async function loadTfModel(modelPath: string, modelType?: ModelType) {
  if (modelType === 'graph') {
    return await tf.loadGraphModel(modelPath);
  }

  return await tf.loadLayersModel(modelPath);
}
