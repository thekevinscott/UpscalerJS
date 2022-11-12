import { Tensor4D, } from '@tensorflow/tfjs-core';
import { Inputs, } from '../types';

const isTensorArray = (inputs: Inputs): inputs is Tensor4D[] => {
  return Array.isArray(inputs);
};

export const getInput = (inputs: Inputs): Tensor4D => {
  if (isTensorArray(inputs)) {
    return inputs[0];
  }
  return inputs;
};
