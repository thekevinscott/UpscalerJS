import fs from 'fs';
import { tf, } from './dependencies.generated';
import { isFourDimensionalTensor, isThreeDimensionalTensor, isTensor, isString, tensorAsClampedArray, hasValidChannels, } from './utils';

export const getInvalidTensorError = (input: tf.Tensor): Error => new Error(
  [
    `Unsupported dimensions for incoming pixels: ${input.shape.length}.`,
    'Only 3 or 4 rank tensors are supported.',
  ].join(' '),
);

export const getInvalidInput = (input: unknown): Error => new Error([
  `Unknown input ${JSON.stringify(input)} provided. Input must be either a rank 3 or 4 tensor,`,
  `a string representing a local path or http-accessible path to an image,`,
  `a Uint8Array, or a Buffer.`,
].join(' '));

export const getInvalidImageSrcInput = (input: string): Error => new Error([
  `Image specified at path ${input} could not be found`,
].join(' '));

export const getInvalidChannelsOfTensor = (input: tf.Tensor): Error => new Error([
  `Invalid channels, only 3 channels are supported at this time. You provided: "${input.shape.slice(-1)[0]}".`,
  `Full tensor shape: ${JSON.stringify(input.shape)}`,
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
    try {
      const image = new Uint8Array(fs.readFileSync(input));
      return tf.node.decodeImage(image);
    } catch (err: unknown) {
      if (err instanceof Error && err?.message.includes('no such file or directory')) {
        throw getInvalidImageSrcInput(input);
      } else {
        throw err;
      }
    }
  }

  throw getInvalidInput(input); 
};

export type GetImageAsTensorInput = tf.Tensor3D | tf.Tensor4D | string | Uint8Array | Buffer;

/* eslint-disable @typescript-eslint/require-await */
export const getImageAsTensor = async (
  input: GetImageAsTensorInput,
): Promise<tf.Tensor4D> => {
  const tensor = getTensorFromInput(input);

  if (!hasValidChannels(tensor)) {
    throw getInvalidChannelsOfTensor(tensor);
  }

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

export const tensorAsBase64 = (tensor: tf.Tensor3D): string => {
  const arr = tensorAsClampedArray(tensor);
  return Buffer.from(arr).toString('base64');
};
