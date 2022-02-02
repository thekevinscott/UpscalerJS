import { tf } from './dependencies.generated';
import { isHTMLImageElement, isString, isFourDimensionalTensor, isThreeDimensionalTensor, isTensor } from './utils';

export const getUnknownError = (input: any) => new Error(
    [
      `Unknown input provided to loadImage that cannot be processed: ${JSON.stringify(input)}`,
      `Can only handle a string pointing to a valid image resource, an HTMLImageElement element,`,
      `or a 3 or 4 rank tensor.`,
    ].join(' '),
  );

  export const getInvalidTensorError = (input: tf.Tensor) => new Error(
      [
        `Unsupported dimensions for incoming pixels: ${input.shape.length}.`,
        'Only 3 or 4 rank tensors are supported.',
      ].join(' '),
    );

export const getImageAsPixels = async (
  pixels: string | HTMLImageElement | tf.Tensor,
): Promise<{
  tensor: tf.Tensor4D;
  type: 'string' | 'HTMLImageElement' | 'tensor';
}> => {
  if (isString(pixels)) {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.src = pixels;
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
    });
    return {
      tensor: tf.browser.fromPixels(img).expandDims(0) as tf.Tensor4D,
      type: 'string',
    };
  }

  if (isHTMLImageElement(pixels)) {
    return {
      tensor: tf.browser.fromPixels(pixels).expandDims(0) as tf.Tensor4D,
      type: 'HTMLImageElement',
    };
  }

  if (isTensor(pixels)) {
    if (isFourDimensionalTensor(pixels)) {
      return {
        tensor: pixels,
        type: 'tensor',
      };
    }

    if (isThreeDimensionalTensor(pixels)) {
      return {
        tensor: pixels.expandDims(0) as tf.Tensor4D,
        type: 'tensor',
      };
    }

    throw getInvalidTensorError(pixels);
  }

  throw getUnknownError(pixels);
};
