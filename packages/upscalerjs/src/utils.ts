import { tf, } from './dependencies.generated';
import type { ParsedModelDefinition, Progress, SingleArgProgress, ResultFormat, MultiArgTensorProgress, UpscaleArgs, } from './types';
import { 
  Range, 
  ModelDefinitionFn, 
  ModelDefinition, 
  ModelDefinitionObjectOrFn, 
  isShape4D, 
  Shape4D, 
  ProcessFn, 
  ModelType, 
  isValidRange, 
  MODEL_DEFINITION_VALIDATION_CHECK_ERROR_TYPE,
  isThreeDimensionalTensor,
  isFourDimensionalTensor,
} from '@upscalerjs/core';
import { isLayersModel, } from './isLayersModel';

export class AbortError extends Error {
  message = 'The upscale request received an abort signal';
}

const ERROR_MISSING_MODEL_DEFINITION_PATH_URL =
  'https://upscalerjs.com/documentation/troubleshooting#missing-model-path';
const ERROR_INVALID_MODEL_TYPE_URL = 'https://upscalerjs.com/documentation/troubleshooting#invalid-model-type';
const WARNING_INPUT_SIZE_AND_PATCH_SIZE_URL = 'https://upscalerjs.com/documentation/troubleshooting#input-size-and-patch-size';
const ERROR_WITH_MODEL_INPUT_SHAPE_URL = 'https://upscalerjs.com/documentation/troubleshooting#error-with-model-input-shape';

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
export const ERROR_WITH_MODEL_INPUT_SHAPE = (inputShape?: unknown) => [
  `Expected model to have a rank-4 compatible input shape. Instead got: ${JSON.stringify(inputShape)}.`,
  `For more information, see ${ERROR_WITH_MODEL_INPUT_SHAPE_URL}.`,
].join('\n');

export const GET_INVALID_SHAPED_TENSOR = (tensor: tf.Tensor): Error => new Error(
  `Invalid shape provided to getWidthAndHeight, expected tensor of rank 3 or 4: ${JSON.stringify(
    tensor.shape,
  )}`,
);


export function getModelDefinitionError(error: MODEL_DEFINITION_VALIDATION_CHECK_ERROR_TYPE, modelDefinition?: ModelDefinition): Error {
  switch(error) {
    case MODEL_DEFINITION_VALIDATION_CHECK_ERROR_TYPE.MISSING_PATH:
      return new Error(ERROR_MISSING_MODEL_DEFINITION_PATH);
    case MODEL_DEFINITION_VALIDATION_CHECK_ERROR_TYPE.INVALID_MODEL_TYPE:
      return new Error(ERROR_INVALID_MODEL_TYPE(modelDefinition?.modelType));
    default:
      return new Error(ERROR_MODEL_DEFINITION_BUG);
  }
}

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

export const tensorAsClampedArray = (tensor: tf.Tensor3D): Uint8Array | Float32Array | Int32Array => tf.tidy(() => {
  const [height, width,] = tensor.shape;
  const fill = tf.fill([height, width,], 255).expandDims(2);
  return tensor.clipByValue(0, 255).concat([fill,], 2).dataSync();
});

export function getModel(modelDefinition: ModelDefinitionObjectOrFn): ModelDefinition {
  /* eslint-disable @typescript-eslint/no-unsafe-call */
  /* eslint-disable @typescript-eslint/no-unsafe-return */
  return isModelDefinitionFn(modelDefinition) ? modelDefinition(tf) : modelDefinition;
}

export function nonNullable<T>(value: T): value is NonNullable<T> {
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

export function loadTfModel<M extends ModelType, R = Promise<M extends 'graph' ? tf.GraphModel : tf.LayersModel>>(modelPath: string, modelType?: M): R {
  if (modelType === 'graph') {
    return tf.loadGraphModel(modelPath) as R;
  }
  return tf.loadLayersModel(modelPath) as R;
}

const getBatchInputShape = (model: tf.LayersModel | tf.GraphModel): unknown => {
  if (isLayersModel(model)) {
    return model.layers[0].batchInputShape;
  }
  return model.inputs[0].shape;
};

export const getInputShape = (model: tf.GraphModel | tf.LayersModel): Shape4D => {
  const batchInputShape = getBatchInputShape(model);
  if (isShape4D(batchInputShape)) {
    return batchInputShape;
  }

  throw new Error(ERROR_WITH_MODEL_INPUT_SHAPE(batchInputShape));
};

export const scaleIncomingPixels = (range?: Range) => (tensor: tf.Tensor4D): tf.Tensor4D => {
  if (isValidRange(range) && range[1] === 1) {
    return tf.mul(tensor, 1 / 255);
  }
  return tensor;
};

const isInputSizeDefined = (inputShape?: Shape4D): inputShape is [null | number, number, number, number] => Boolean(inputShape) && isShape4D(inputShape) && Boolean(inputShape[1]) && Boolean(inputShape[2]);

export const parsePatchAndInputSizes = (
  model: tf.LayersModel | tf.GraphModel,
  {
    patchSize,
    padding,
  }: UpscaleArgs): Pick<UpscaleArgs, 'patchSize' | 'padding'> => {
    const inputShape = getInputShape(model);
  if (isInputSizeDefined(inputShape) && patchSize !== undefined) {
    warn(WARNING_INPUT_SIZE_AND_PATCH_SIZE);
  }
  if (isInputSizeDefined(inputShape)) {
    if (inputShape[1] !== inputShape[2]) {
      throw new Error('Input shape must be square');
    }
    return {
      patchSize: inputShape[1] - (padding || 0) * 2,
      padding,
    };
  }
  return {
    patchSize,
    padding,
  };
};

export const padInput = (inputShape?: Shape4D) => (pixels: tf.Tensor4D): tf.Tensor4D => {
  const pixelsHeight = pixels.shape[1];
  const pixelsWidth = pixels.shape[2];
  if (isInputSizeDefined(inputShape) && (inputShape[1] > pixelsHeight || inputShape[2] > pixelsWidth)) {
    return tf.tidy(() => {
      const height = Math.max(pixelsHeight, inputShape[1]);
      const width = Math.max(pixelsWidth, inputShape[2]);
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
  imageSize: Shape4D,
  scale: number,
) => (
  pixels: tf.Tensor4D
): tf.Tensor4D => {
  const height = imageSize[1] * scale;
  const width = imageSize[2] * scale;
  if (height < pixels.shape[1] || width < pixels.shape[2]) {
    return tf.tidy(() => tf.slice(pixels, [0, 0, 0,], [1, height, width, 3,]));
  }
  return pixels;
};

export const scaleOutput = (range?: Range) => (pixels: tf.Tensor4D): tf.Tensor4D => {
  const endingRange = isValidRange(range) ? range[1] : 255;
  return pixels.clipByValue(0, endingRange).mul(endingRange === 1 ? 255 : 1);
};

export const parseModelDefinition: ParseModelDefinition = (modelDefinition) => ({
  ...modelDefinition,
});

export type ParseModelDefinition = (m: ModelDefinition) => ParsedModelDefinition;

export const getWidthAndHeight = (tensor: tf.Tensor3D | tf.Tensor4D): [number, number] => {
  if (isFourDimensionalTensor(tensor)) {
    return [tensor.shape[1], tensor.shape[2],];
  }
  if (isThreeDimensionalTensor(tensor)) {
    return [tensor.shape[0], tensor.shape[1],];
  }

  throw GET_INVALID_SHAPED_TENSOR(tensor);
};
