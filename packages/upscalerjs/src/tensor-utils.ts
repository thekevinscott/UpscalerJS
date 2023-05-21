import { tf, } from './dependencies.generated';
import { 
  Range, 
  Shape4D, 
  isShape4D, 
  isValidRange, 
  isThreeDimensionalTensor,
  isFourDimensionalTensor,
} from '@upscalerjs/core';
import {
  GET_INVALID_SHAPED_TENSOR,
} from './errors-and-warnings';

export const isInputSizeDefined = (inputShape?: Shape4D): inputShape is [null | number, number, number, number] => Boolean(inputShape) && isShape4D(inputShape) && Boolean(inputShape[1]) && Boolean(inputShape[2]);

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

export const getWidthAndHeight = (tensor: tf.Tensor3D | tf.Tensor4D | tf.Tensor): [number, number] => {
  if (isFourDimensionalTensor(tensor)) {
    return [tensor.shape[1], tensor.shape[2],];
  }
  if (isThreeDimensionalTensor(tensor)) {
    return [tensor.shape[0], tensor.shape[1],];
  }

  throw GET_INVALID_SHAPED_TENSOR(tensor.shape);
};

export const scaleIncomingPixels = (range?: Range) => (tensor: tf.Tensor4D): tf.Tensor4D => {
  if (isValidRange(range) && range[1] === 1) {
    return tf.mul(tensor, 1 / 255);
  }
  return tensor;
};

export const tensorAsClampedArray = (tensor: tf.Tensor3D): Uint8Array | Float32Array | Int32Array => tf.tidy(() => {
  const [height, width,] = tensor.shape;
  const fill = tf.fill([height, width,], 255).expandDims(2);
  return tensor.clipByValue(0, 255).concat([fill,], 2).dataSync();
});