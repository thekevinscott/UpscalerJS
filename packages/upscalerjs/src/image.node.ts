import * as fs from 'fs';
import { tf, } from './dependencies.generated';
import { isFourDimensionalTensor, isThreeDimensionalTensor, isTensor, isString, } from './utils';

/* eslint-disable @typescript-eslint/no-explicit-any */
export const getInvalidTensorError = (input: tf.Tensor) => new Error(
  [
    `Unsupported dimensions for incoming pixels: ${input.shape.length}.`,
    'Only 3 or 4 rank tensors are supported.',
  ].join(' '),
);

export const getInvalidInput = (input: any) => new Error([
  `Unknown input ${JSON.stringify(input)} provided. Input must be either a rank 3 or 4 tensor,`,
  `a string representing a local path or http-accessible path to an image,`,
  `a Uint8Array, or a Buffer.`,
].join(' '));

const isUint8Array = (input: GetImageAsTensorInput): input is Uint8Array => input.constructor === Uint8Array;
const isBuffer = (input: GetImageAsTensorInput): input is Buffer => input.constructor === Buffer;

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
export const getImageAsTensor = async (
  input: GetImageAsTensorInput,
): Promise<tf.Tensor4D> => {
  const tensor = await getTensorFromInput(input);

  if (isThreeDimensionalTensor(tensor)) {
    /* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
    const expandedTensor = tensor.expandDims(0) as tf.Tensor4D;
    tensor.dispose();
    return expandedTensor;
  }

  if (isFourDimensionalTensor(tensor)) {
    return tensor;
  }

  throw getInvalidTensorError(tensor);
};
