import { tf, } from './dependencies.generated';
import { isFourDimensionalTensor, isThreeDimensionalTensor, isTensor, isString, } from './utils';

export const getInvalidTensorError = (input: tf.Tensor) => new Error(
    [
      `Unsupported dimensions for incoming pixels: ${input.shape.length}.`,
      'Only 3 or 4 rank tensors are supported.',
    ].join(' '),
  );

const getTensorFromInput = async (input: GetImageAsPixelsInput): Promise<tf.Tensor3D | tf.Tensor4D> => {
  if (isTensor(input)) {
    return input;
  }

  if (isString(input)) {
    const imgHTMLElement = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.src = input;
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
    });

    return tf.browser.fromPixels(imgHTMLElement);
  }

  return tf.browser.fromPixels(input);
};

// Bug with TFJS, ImageBitmap's types differ between browser.fromPixels and the exported type
type FromPixelsInputs = Exclude<tf.FromPixelsInputs['pixels'], 'ImageBitmap'> | ImageBitmap;
export type GetImageAsPixelsInput = tf.Tensor3D | tf.Tensor4D | string | FromPixelsInputs;
export const getImageAsPixels = async (
  input: GetImageAsPixelsInput,
): Promise<{
  tensor: tf.Tensor4D;
  canDispose: boolean;
}> => {
  // TODO: Refactor this
  // This is to handle the test case mocking from image.browser.test
  // Once we run these unit tests in a real browser we can simplify this if clause
  if (isString(input) || isTensor(input)) {
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
  }

  const tensor = tf.browser.fromPixels(input);
  if (isThreeDimensionalTensor(tensor)) {
    return {
      tensor: tensor.expandDims(0),
      canDispose: true,
    };
  }

  return {
    tensor,
    canDispose: true,
  };

};

export const isHTMLImageElement = (pixels: GetImageAsPixelsInput): pixels is HTMLImageElement => {
  try {
    return pixels instanceof HTMLImageElement;
  } catch (err) {
    // may be in a webworker, or in Node
    return false;
  }
};
