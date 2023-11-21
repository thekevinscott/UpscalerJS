import * as tf from '@tensorflow/tfjs-core';
import { Tensor, Tensor3D, Tensor4D, } from '@tensorflow/tfjs-core';
import { DynamicShape4D, FixedShape4D, IsTensor, ModelType, Shape4D } from './types';

export const isShape4D = (shape?: unknown): shape is Shape4D => {
  if (!Boolean(shape) || !Array.isArray(shape) || shape.length !== 4) {
    return false;
  }
  return shape.every((value) => value === null || typeof value === 'number');
};

export const isFixedShape4D = (shape?: unknown): shape is FixedShape4D => isShape4D(shape) && shape[1] !== null && shape[2] !== null && shape[1] > 0 && shape[2] > 0;
export const isDynamicShape4D = (shape?: unknown): shape is DynamicShape4D => isShape4D(shape) && !isFixedShape4D(shape);
export function makeIsNDimensionalTensor<T extends Tensor>(rank: number): IsTensor<T> {
  function fn(pixels: Tensor): pixels is T {
    try {
      return pixels.shape.length === rank;
    } catch (err) {
      // empty
    }
    return false;
  }

  return fn;
}
export const isFourDimensionalTensor = makeIsNDimensionalTensor<Tensor4D>(4);
export const isThreeDimensionalTensor = makeIsNDimensionalTensor<Tensor3D>(3);
export const isTensor = (input: unknown): input is tf.Tensor => input instanceof tf.Tensor;
export const isString = (el: unknown): el is string => typeof el === 'string';

export const isValidModelType = (modelType: unknown): modelType is ModelType => typeof modelType === 'string' && ['layers', 'graph',].includes(modelType);

export const hasValidChannels = (tensor: tf.Tensor): boolean => tensor.shape.slice(-1)[0] === 3;

export const isNumber = (el: unknown): el is number => typeof el === 'number';
export const isValidRange = (range: unknown): range is Range => Array.isArray(range) && range.length === 2 && range.every(isNumber);
