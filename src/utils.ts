import * as tf from '@tensorflow/tfjs';
import { IUpscaleOptions } from './types';

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
