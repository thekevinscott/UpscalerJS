import * as fs from 'fs';
import * as tf from '@tensorflow/tfjs-node';
import { isFourDimensionalTensor, isThreeDimensionalTensor, isTensor, isString, } from './utils';

export const getInvalidTensorError = (input: tf.Tensor) => new Error(
  [
    `Unsupported dimensions for incoming pixels: ${input.shape.length}.`,
    'Only 3 or 4 rank tensors are supported.',
  ].join(' '),
);

export const getInvalidInput = (input: any) => new Error([
  `Unknown input ${JSON.stringify(input)} provided. Input must be either a rank 3 or 4 tensor,`,
  `a string representing a local path or http-accessible path to an image,`,
  `a Uint8Array, or a Buffer.`
].join(' '))

const isUint8Array = (input: GetImageAsTensorInput): input is Uint8Array => {
  return input.constructor === Uint8Array;
}

const isBuffer = (input: GetImageAsTensorInput): input is Buffer => {
  return input.constructor === Buffer;
}

const getTensorFromInput = async (input: GetImageAsTensorInput): Promise<tf.Tensor3D | tf.Tensor4D> => {
  if (isUint8Array(input)) {
    return tf.node.decodeImage(input);
  }

  if (isBuffer(input)) {
    return tf.node.decodeImage(input);
  }

  if (isTensor(input)) {
    return input;
  }

  if (isString(input)) {
    if (input.startsWith('http')) {
      const arrayBuffer = await fetch(input).then(r => r.blob()).then(blob => blob.arrayBuffer());
      const image = new Uint8Array(arrayBuffer);
      return tf.node.decodeImage(image);
    } else {
      const image = new Uint8Array(fs.readFileSync(input));
      return tf.node.decodeImage(image);
    }
  }

  throw getInvalidInput(input);
}

export type GetImageAsTensorInput = tf.Tensor3D | tf.Tensor4D | string | Uint8Array | Buffer;
export const getImageAsTensor = async (
  input: GetImageAsTensorInput,
): Promise<{
  tensor: tf.Tensor4D;
  canDispose: boolean;
}> => {
  const tensor = await getTensorFromInput(input);

  if (isThreeDimensionalTensor(tensor)) {
    return {
      tensor: tensor.expandDims(0),
      canDispose: true,
    };
  }

  if (isFourDimensionalTensor(tensor)) {
    return {
      tensor,
      canDispose: !isTensor(input),
    };
  }

  throw getInvalidTensorError(tensor);
};
