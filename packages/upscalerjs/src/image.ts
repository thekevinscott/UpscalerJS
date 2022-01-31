import { tf } from './dependencies.generated';
import { isHTMLImageElement, isString, isFourDimensionalTensor } from './utils';

export const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.src = src;
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
  });

export const getImageAsPixels = async (
  pixels: string | HTMLImageElement | tf.Tensor,
): Promise<{
  tensor: tf.Tensor4D;
  type: 'string' | 'HTMLImageElement' | 'tensor';
}> => {
  if (isString(pixels)) {
    const img = await loadImage(pixels);
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

  if (isFourDimensionalTensor(pixels)) {
    return {
      tensor: pixels,
      type: 'tensor',
    };
  }

  if (pixels.shape.length === 3) {
    return {
      tensor: pixels.expandDims(0) as tf.Tensor4D,
      type: 'tensor',
    };
  }

  throw new Error(
    [
      `Unsupported dimensions for incoming pixels: ${pixels.shape.length}.`,
      'Only 3 or 4 dimension tensors are supported.',
    ].join(' '),
  );
};
