import type { Tensor, } from '@tensorflow/tfjs-core';
import type { Progress, SingleArgProgress, ResultFormat, MultiArgTensorProgress, } from './types';
import {
  type ModelDefinition,
  type ProcessFn,
  type TF,
} from '../../../shared/src/types';
import {
  ERROR_INVALID_MODEL_TYPE,
  ERROR_UNDEFINED_MODEL,
  GET_MODEL_CONFIGURATION_MISSING_PATH_AND_INTERNALS,
} from './errors-and-warnings';
import { isValidModelType, } from '../../../shared/src/constants';

export const warn = (msg: string | string[]): void => {
  console.warn(Array.isArray(msg) ? msg.join('\n') : msg);// skipcq: JS-0002
};

export function isProgress(p: undefined | Progress): p is Progress { return p !== undefined && typeof p === 'function'; }
export function isSingleArgProgress(p: Progress): p is SingleArgProgress { return isProgress(p) && p.length <= 1; }
export const isMultiArgTensorProgress = (p: Progress, output: ResultFormat, progressOutput: ResultFormat): p is MultiArgTensorProgress => {
  if (!isProgress(p) || p.length <= 1) {
    return false;
  }
  if (progressOutput === undefined && output === 'tensor') {
    return true;
  }
  return progressOutput === 'tensor';
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

export function nonNullable<T>(value: T): value is NonNullable<T> {
  return value !== null && value !== undefined;
}

// this function disposes of any input tensors
export function processAndDisposeOfTensor<T extends Tensor>(
  tf: TF,
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

export const checkModelDefinition = (modelDefinition?: ModelDefinition): void => {
  if (modelDefinition === undefined) {
    throw ERROR_UNDEFINED_MODEL;
  }
  if (!isValidModelType(modelDefinition.modelType ?? 'layers')) {
    throw ERROR_INVALID_MODEL_TYPE(modelDefinition);
  }
  if (!modelDefinition.path && !modelDefinition._internals?.path) {
    throw GET_MODEL_CONFIGURATION_MISSING_PATH_AND_INTERNALS(modelDefinition);
  }
};
