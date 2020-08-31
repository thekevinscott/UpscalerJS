import * as tf from '@tensorflow/tfjs';

export const isString = (pixels: any): pixels is string => {
  return typeof pixels === 'string';
};

export const isHTMLImageElement = (pixels: any): pixels is HTMLImageElement => {
  try {
    return pixels instanceof HTMLImageElement;
  } catch (err) {
    // may be in a webworker, or in Node
    return false;
  }
};

export const isFourDimensionalTensor = (
  pixels: tf.Tensor,
): pixels is tf.Tensor4D => {
  return pixels.shape.length === 4;
};

const ROOT = 'https://unpkg.com/upscalerjs-models';
const MODEL_DIR = 'models';

export const buildURL = (modelFolder: string) =>
  `${ROOT}@latest/${MODEL_DIR}/${modelFolder}/model.json`;

export const buildConfigURL = (modelFolder: string) =>
  `${ROOT}@latest/${MODEL_DIR}/${modelFolder}/config.json`;

export const warn = (msg: string | string[]) => {
  if (Array.isArray(msg)) {
    // tslint:disable-next-line:no-console
    console.warn(msg.join('\n'));
  } else {
    // tslint:disable-next-line:no-console
    console.warn(msg);
  }
};
