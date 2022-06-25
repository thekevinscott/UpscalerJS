import { tf, } from './dependencies.generated';
import { ROOT, } from './constants';
import { Progress, MultiArgProgress, SingleArgProgress, ResultFormat, ModelDefinition, } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */
export const isString = (pixels: any): pixels is string => typeof pixels === 'string';

function makeIsNDimensionalTensor<T extends tf.Tensor>(rank: number) {
  function fn(pixels: tf.Tensor): pixels is T {
    try {
      return pixels.shape.length === rank;
    } catch (err) { }
    return false;
  }

  return fn;
}

// const ERROR_URL_EXPLICIT_SCALE_REQUIRED =
//   'https://thekevinscott.github.io/UpscalerJS/#/?id=you-must-provide-an-explicit-scale';
// const ERROR_URL_EXPLICIT_SCALE_DISALLOWED =
//   'https://thekevinscott.github.io/UpscalerJS/#/?id=you-are-requesting-the-pretrained-model-but-are-providing-an-explicit-scale';

export function getModelDefinitionError(modelDefinition?: ModelDefinition) {
  if (!modelDefinition) {
    return new Error('You must provide a model definition');
  }
  if (!modelDefinition.path) {
    return new Error('No model path provided');
  }
  if (!modelDefinition.scale) {
    return new Error('No model scale provided');
  }
  return new Error('Bug with code');
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
/* eslint-disable @typescript-eslint/no-explicit-any */
export const isTensor = (input: any): input is tf.Tensor => {
  return input instanceof tf.Tensor;
};

const MODEL_DIR = 'models';

export const buildURL = (modelFolder: string) =>
  `${ROOT}/${MODEL_DIR}/${modelFolder}/model.json`;

export const buildConfigURL = (modelFolder: string) =>
  `${ROOT}/${MODEL_DIR}/${modelFolder}/config.json`;

export const warn = (msg: string | string[]) => {
  if (Array.isArray(msg)) {
    console.warn(msg.join('\n'));// skipcq: JS-0002
  } else {
    console.warn(msg);// skipcq: JS-0002
  }
};

export function isProgress<O extends ResultFormat = 'src', PO extends ResultFormat = undefined>(p: undefined | Progress<any, any>): p is Exclude<Progress<O, PO>, undefined> { return p !== undefined && typeof p === 'function'; }
export function isSingleArgProgress(p: Progress<any, any>): p is SingleArgProgress { return isProgress(p) && p.length <= 1; }
export const isMultiArgTensorProgress = (p: Progress<any, any>, output: ResultFormat, progressOutput: ResultFormat): p is MultiArgProgress<'tensor'> => {
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
