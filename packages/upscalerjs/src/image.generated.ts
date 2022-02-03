import { tf } from './dependencies.generated';
import { isFourDimensionalTensor, isThreeDimensionalTensor, isTensor, isString } from './utils';

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
  pixels: string | tf.FromPixelsInputs,
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
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.src = pixels;
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
    });

    const tensor = tf.browser.fromPixels(img);

    if (isFourDimensionalTensor(tensor)) {
      return {
        tensor,
        canDispose: true,
      };
    }

    if (isThreeDimensionalTensor(tensor)) {
      return {
        tensor: tensor.expandDims(0),
        canDispose: true,
      };
    }

    throw getInvalidTensorError(tensor);
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
