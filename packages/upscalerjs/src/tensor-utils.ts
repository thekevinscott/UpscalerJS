import { Tensor, Tensor3D, Tensor4D, } from '@tensorflow/tfjs-core';
import { 
  Range, 
  Shape4D, 
  isValidRange, 
  isThreeDimensionalTensor,
  isFourDimensionalTensor,
  isFixedShape4D,
  FixedShape4D,
  isTensor,
  TF,
} from '@upscalerjs/core';
import {
  GET_INVALID_SHAPED_TENSOR,
  GET_UNDEFINED_TENSORS_ERROR,
} from './errors-and-warnings';
import {
  nonNullable,
} from './utils';
import {
  Input,
} from './image.generated';
import {
  Coordinate,
} from './types';

export const padInput = (tf: TF, inputShape: Shape4D) => (pixels: Tensor4D): Tensor4D => {
  const pixelsHeight = pixels.shape[1];
  const pixelsWidth = pixels.shape[2];
  if (isFixedShape4D(inputShape) && (inputShape[1] > pixelsHeight || inputShape[2] > pixelsWidth)) {
    return tf.tidy(() => {
      const height = Math.max(pixelsHeight, inputShape[1]);
      const width = Math.max(pixelsWidth, inputShape[2]);
      const rightTensor = tf.zeros([1, pixelsHeight, width - pixelsWidth, 3,]) as Tensor4D;
      const bottomTensor = tf.zeros([1, height - pixelsHeight, width, 3,]) as Tensor4D;
      const topTensor = tf.concat([pixels, rightTensor,], 2);
      const final = tf.concat([topTensor, bottomTensor,], 1);
      return final;
    });
  }
  return pixels;
};

export const trimInput = (
  tf: TF,
  imageSize: FixedShape4D,
  scale: number,
) => (
  pixels: Tensor4D
): Tensor4D => {
  const height = imageSize[1] * scale;
  const width = imageSize[2] * scale;
  if (height < pixels.shape[1] || width < pixels.shape[2]) {
    return tf.tidy(() => tf.slice(pixels, [0, 0, 0,], [1, height, width, 3,]));
  }
  return pixels;
};

export const scaleOutput = (range?: Range) => (pixels: Tensor4D): Tensor4D => {
  const endingRange = isValidRange(range) ? range[1] : 255;
  return pixels.clipByValue(0, endingRange).mul(endingRange === 1 ? 255 : 1);
};

export const getWidthAndHeight = (tensor: Tensor): Coordinate => {
  if (isFourDimensionalTensor(tensor)) {
    return [tensor.shape[1], tensor.shape[2],];
  }
  if (isThreeDimensionalTensor(tensor)) {
    return [tensor.shape[0], tensor.shape[1],];
  }

  throw GET_INVALID_SHAPED_TENSOR(tensor.shape);
};

export const scaleIncomingPixels = (tf: TF, range?: Range) => (tensor: Tensor4D): Tensor4D => {
  if (isValidRange(range) && range[1] === 1) {
    return tf.mul(tensor, 1 / 255);
  }
  return tensor;
};

export const tensorAsClampedArray = (tf: TF, tensor: Tensor3D): Uint8Array | Float32Array | Int32Array => tf.tidy(() => {
  const [height, width,] = tensor.shape;
  const fill = tf.fill([height, width,], 255).expandDims(2);
  return tensor.clipByValue(0, 255).concat([fill,], 2).dataSync();
});

// if given a tensor, we copy it; otherwise, we pass input through unadulterated
// this allows us to safely dispose of memory ourselves without having to manage
// what input is in which format
export const getCopyOfInput = (input: Input): Input => (isTensor(input) ? input.clone() : input);

export function concatTensors<T extends Tensor3D | Tensor4D> (tf: TF, tensors: Array<T | undefined>, axis = 0): T {
  const definedTensors: Array<Tensor3D | Tensor4D> = tensors.filter(nonNullable);
  if (definedTensors.length === 0) {
    throw GET_UNDEFINED_TENSORS_ERROR;
  }
  const concatenatedTensor = tf.concat(definedTensors, axis);
  tensors.forEach(tensor => tensor?.dispose());
  return concatenatedTensor as T;
}
