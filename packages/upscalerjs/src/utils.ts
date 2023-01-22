import { tf, } from './dependencies.generated';
import type { Progress, SingleArgProgress, ResultFormat, MultiArgTensorProgress, } from './types';
import { Range, ModelDefinitionFn, ModelDefinition, ModelDefinitionObjectOrFn, Shape4D, ProcessFn, ModelType, isValidModelType, isValidRange, } from '@upscalerjs/core';

export class AbortError extends Error {
  message = 'The upscale request received an abort signal';
}

const ERROR_MISSING_MODEL_DEFINITION_PATH_URL =
  'https://upscalerjs.com/documentation/troubleshooting#missing-model-path';
const ERROR_INVALID_MODEL_TYPE_URL = 'https://upscalerjs.com/documentation/troubleshooting#invalid-model-type';
const WARNING_INPUT_SIZE_AND_PATCH_SIZE_URL = 'https://upscalerjs.com/documentation/troubleshooting#input-size-and-patch-size';

export const ERROR_MISSING_MODEL_DEFINITION_PATH = [
  'You must provide a "path" when providing a model definition',
  `For more information, see ${ERROR_MISSING_MODEL_DEFINITION_PATH_URL}.`,
].join('\n');
export const ERROR_INVALID_MODEL_TYPE = (modelType: unknown) => ([
  `You've provided an invalid model type: ${JSON.stringify(modelType)}. Accepted types are "layers" and "graph".`,
  `For more information, see ${ERROR_INVALID_MODEL_TYPE_URL}.`,
].join('\n'));
export const ERROR_MODEL_DEFINITION_BUG = 'There is a bug with the upscaler code. Please report this.';
export const WARNING_INPUT_SIZE_AND_PATCH_SIZE = [
  'You have provided a patchSize, but the model definition already includes an input size.',
  'Your patchSize will be ignored.',
  `For more information, see ${WARNING_INPUT_SIZE_AND_PATCH_SIZE_URL}.`,
].join('\n');

export function getModelDefinitionError(modelDefinition: ModelDefinition): Error {
  if (!modelDefinition.path) {
    return new Error(ERROR_MISSING_MODEL_DEFINITION_PATH);
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

export function isModelDefinitionFn(modelDefinition: ModelDefinitionObjectOrFn): modelDefinition is ModelDefinitionFn { return typeof modelDefinition === 'function'; }

export const tensorAsClampedArray = (tensor: tf.Tensor3D, range?: Range): Uint8Array | Float32Array | Int32Array => tf.tidy(() => {
  const [height, width,] = tensor.shape;
  const fill = tf.fill([height, width,], 255).expandDims(2);
  const resizedTensor = isValidRange(range) && range[1] === 1 ? tensor.mul(255) : tensor;
  return resizedTensor.clipByValue(0, 255).concat([fill,], 2).dataSync();
});

export function getModel(modelDefinition: ModelDefinitionObjectOrFn): ModelDefinition {
  /* eslint-disable @typescript-eslint/no-unsafe-call */
  /* eslint-disable @typescript-eslint/no-unsafe-return */
  return isModelDefinitionFn(modelDefinition) ? modelDefinition(tf) : modelDefinition;
};

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
    if (!tensor.isDisposed && tensor !== processedTensor) {
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

export const getInputShape = (model: tf.GraphModel | tf.LayersModel): Shape4D => {
  const batchInputShape = isLayersModel(model) ? model.layers[0].batchInputShape : model.executor.graph.inputs[0].attrParams.shape.value
  if (isShape4D(batchInputShape)) {
    return batchInputShape;
  }

  throw new Error('Unexpected shape found for model: ')
};

export const scaleIncomingPixels = (range?: Range) => (tensor: tf.Tensor4D): tf.Tensor4D => {
  if (isValidRange(range) && range[1] === 255) {
    return tf.mul(tensor, 1 / 255);
  }
  return tensor;
};

export const parsePatchAndInputSizes = (
  {
    inputSize,
  }: ModelDefinition,
  {
    patchSize,
    padding,
  }: UpscaleArgs): Pick<UpscaleArgs, 'patchSize' | 'padding'> => {
  if (inputSize !== undefined && patchSize !== undefined) {
    warn(WARNING_INPUT_SIZE_AND_PATCH_SIZE);
  }
  if (inputSize) {
    return {
      patchSize: inputSize - (padding || 0) * 2,
      padding,
    };
  }
  return {
    patchSize,
    padding,
  };
};

export const padInput = (inputSize?: Shape4D) => (pixels: tf.Tensor4D): tf.Tensor4D => {
  const [_, pixelsHeight, pixelsWidth,] = pixels.shape;
  if (inputSize[1] && inputSize[2] && (inputSize[1] > pixelsHeight || inputSize[2] > pixelsWidth)) {
    return tf.tidy(() => {
      const height = Math.max(pixelsHeight, inputSize[1]);
      const width = Math.max(pixelsWidth, inputSize[2]);
      const rightTensor = tf.zeros([1, pixelsHeight, width - pixelsWidth, 3,]) as tf.Tensor4D;
      const bottomTensor = tf.zeros([1, height - pixelsHeight, width, 3,]) as tf.Tensor4D;
      const topTensor = tf.concat([pixels, rightTensor,], 2);
      const final = tf.concat([topTensor, bottomTensor,], 1);
      return final;
    });
  }
  return pixels;
};

export const trimInput = (
  scale: number,
  pixels: tf.Tensor4D
  imageSize?: Shape4D,
): tf.Tensor4D => {
  const height = imageSize[1] * scale;
  const width = imageSize[2] * scale;
  if (height < pixels.shape[1] || width < pixels.shape[2]) {
    return tf.tidy(() => {
      return tf.slice(pixels, [0, 0, 0,], [1, height, width, 3,]);
    });
  }
  return pixels;
};
