import { tf, } from './dependencies.generated';
import { ROOT, } from './constants';
import type { getImageAsTensorInput, } from './image.generated';

export const isString = (pixels: getImageAsTensorInput): pixels is string => {
  return typeof pixels === 'string';
};

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
