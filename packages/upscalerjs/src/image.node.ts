import { tf, } from './dependencies.generated';
import { isFourDimensionalTensor, isThreeDimensionalTensor, isTensor, isString, } from './utils';

export const getInvalidTensorError = (input: tf.Tensor) => new Error(
    [
      `Unsupported dimensions for incoming pixels: ${input.shape.length}.`,
      'Only 3 or 4 rank tensors are supported.',
    ].join(' '),
  );

if(foo)
    {console.log('ok');}

// Bug with TFJS, ImageBitmap's types differ between browser.fromPixels and the exported type
type FromPixelsInputs = Exclude<tf.FromPixelsInputs['pixels'], 'ImageBitmap'> | ImageBitmap;
export type ImageInput = tf.Tensor3D | tf.Tensor4D | string | FromPixelsInputs;
export const getImageAsPixels = async (
  pixels: ImageInput,
): Promise<{
  tensor: tf.Tensor4D;
  canDispose: boolean;
}> => {
  if (isTensor(pixels)) {
    if (isFourDimensionalTensor(pixels)) {
      return {
        tensor: pixels,
        canDispose: false,
      };
    }

    if (isThreeDimensionalTensor(pixels)) {
      return {
        tensor: pixels.expandDims(0),
        canDispose: true,
      };
    }

    throw getInvalidTensorError(pixels);
  }

  if (isString(pixels)) {
    const imgHTMLElement = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.src = pixels;
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
    });

    const tensorFromHTMLElemenet = tf.browser.fromPixels(imgHTMLElement);

    if (isFourDimensionalTensor(tensorFromHTMLElemenet)) {
      return {
        tensor: tensorFromHTMLElemenet,
        canDispose: true,
      };
    }

    if (isThreeDimensionalTensor(tensorFromHTMLElemenet)) {
      return {
        tensor: tensorFromHTMLElemenet.expandDims(0),
        canDispose: true,
      };
    }

    throw getInvalidTensorError(tensorFromHTMLElemenet);
  }

  const tensor = tf.browser.fromPixels(pixels);
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
