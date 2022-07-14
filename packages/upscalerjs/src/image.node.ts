import fs from 'fs';
import { tf, } from './dependencies.generated';
import { isFourDimensionalTensor, isThreeDimensionalTensor, isTensor, isString, } from './utils';

export const getInvalidTensorError = (input: tf.Tensor) => new Error(
  [
    `Unsupported dimensions for incoming pixels: ${input.shape.length}.`,
    'Only 3 or 4 rank tensors are supported.',
  ].join(' '),
);

export const getInvalidInput = (input: unknown) => new Error([
  `Unknown input ${JSON.stringify(input)} provided. Input must be either a rank 3 or 4 tensor,`,
  `a string representing a local path or http-accessible path to an image,`,
  `a Uint8Array, or a Buffer.`,
].join(' '));

const isUint8Array = (input: GetImageAsTensorInput): input is Uint8Array => input.constructor === Uint8Array;
const isBuffer = (input: GetImageAsTensorInput): input is Buffer => input.constructor === Buffer;

const getTensorFromInput = (input: GetImageAsTensorInput): tf.Tensor3D | tf.Tensor4D => {
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
    // if (input.startsWith('http')) {
    //   const arrayBuffer = await fetch(input).then(r => r.blob()).then(blob => blob.arrayBuffer());
    //   const image = new Uint8Array(arrayBuffer);
    //   return tf.node.decodeImage(image);
    // } else {
      const image = new Uint8Array(fs.readFileSync(input));
      return tf.node.decodeImage(image);
    // }
  }

  throw getInvalidInput(input); 
};

export type GetImageAsTensorInput = tf.Tensor3D | tf.Tensor4D | string | Uint8Array | Buffer;

/* eslint-disable @typescript-eslint/require-await */
export const getImageAsTensor = async (
  input: GetImageAsTensorInput,
): Promise<tf.Tensor4D> => {
  const tensor = getTensorFromInput(input);

  if (isThreeDimensionalTensor(tensor)) {
    const expandedTensor: tf.Tensor4D = tensor.expandDims(0);
    tensor.dispose();
    return expandedTensor;
  }

  if (isFourDimensionalTensor(tensor)) {
    return tensor;
  }

  throw getInvalidTensorError(tensor);
};
