import { tf, } from './dependencies.generated';
import { ROOT, } from './constants';
import { Progress, MultiArgProgress, SingleArgProgress } from './types';

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

export const isProgress = (p: undefined | Progress): p is SingleArgProgress | MultiArgProgress => p !== undefined && typeof p === 'function';
export const isSingleArgProgress = (progress: Progress): progress is SingleArgProgress => isProgress(progress) && progress.length <= 1;
export const isMultiArgProgress = (progress: Progress): progress is MultiArgProgress => isProgress(progress) && progress.length > 1;
