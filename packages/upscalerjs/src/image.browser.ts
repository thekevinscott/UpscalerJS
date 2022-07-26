import { tf, } from './dependencies.generated';
import { isFourDimensionalTensor, isThreeDimensionalTensor, isTensor, isString, tensorAsClampedArray, } from './utils';

export const getInvalidTensorError = (input: tf.Tensor) => new Error(
    [
      `Unsupported dimensions for incoming pixels: ${input.shape.length}.`,
      'Only 3 or 4 rank tensors are supported.',
    ].join(' '),
  );

export const getInvalidImageError = () => new Error([
  'Failed to load image',
].join(' '));

export const loadImage = (src: string): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
  const img = new Image();
  img.src = src;
  img.crossOrigin = 'anonymous';
  img.onload = () => resolve(img);
  img.onerror = () => reject(getInvalidImageError());
});

const getTensorFromInput = async (input: GetImageAsTensorInput): Promise<tf.Tensor3D | tf.Tensor4D> => {
  if (isTensor(input)) {
    return input;
  }

  if (isString(input)) {
    const imgHTMLElement = await loadImage(input);
    return tf.browser.fromPixels(imgHTMLElement);
  }

  return tf.browser.fromPixels(input);
};

// Bug with TFJS, ImageBitmap's types differ between browser.fromPixels and the exported type
type FromPixelsInputs = Exclude<tf.FromPixelsInputs['pixels'], 'ImageBitmap'> | ImageBitmap;
export type GetImageAsTensorInput = tf.Tensor3D | tf.Tensor4D | string | FromPixelsInputs;
export const getImageAsTensor = async (
  input: GetImageAsTensorInput,
): Promise<tf.Tensor4D> => {
  const tensor = await getTensorFromInput(input);

  if (isThreeDimensionalTensor(tensor)) {
    // https://github.com/tensorflow/tfjs/issues/1125
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

export const isHTMLImageElement = (pixels: GetImageAsTensorInput): pixels is HTMLImageElement => {
  try {
    return pixels instanceof HTMLImageElement;
  } catch (err) {
    return false;
  }
};

export const tensorAsBase64 = (tensor: tf.Tensor3D): string => {
  const arr = tensorAsClampedArray(tensor);
  const [height, width, ] = tensor.shape;
  const imageData = new ImageData(width, height);
  imageData.data.set(arr);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('No context found');
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL();
};
