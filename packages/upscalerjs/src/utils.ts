import { tf, } from './dependencies.generated';
import { ROOT, } from './constants';
import { Progress, MultiArgProgress, SingleArgProgress, ReturnType } from './types';

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
    // tslint:disable-next-line:no-console
    console.warn(msg.join('\n'));
  } else {
    // tslint:disable-next-line:no-console
    console.warn(msg);
  }
};

export function isProgress<O extends ReturnType = 'src', PO extends ReturnType = undefined>(p: undefined | Progress<any, any>): p is Exclude<Progress<O, PO>, undefined> { return p !== undefined && typeof p === 'function'; }
export function isSingleArgProgress(p: Progress<any, any>): p is SingleArgProgress { return isProgress(p) && p.length <= 1; }
export const isMultiArgTensorProgress = (p: Progress<any, any>, output: ReturnType, progressOutput: ReturnType): p is MultiArgProgress<'tensor'> => {
  if (!isProgress(p) || p.length <= 1) {
    return false;
  }
  return progressOutput === undefined && output === 'tensor' || progressOutput === 'tensor';
}

export const isAborted = (abortSignal?: AbortSignal) => !!abortSignal && abortSignal?.aborted;
