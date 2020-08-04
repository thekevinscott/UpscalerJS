import * as tf from '@tensorflow/tfjs';
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
): Promise<tf.Tensor4D> => {
  if (isString(pixels)) {
    const img = await loadImage(pixels);
    return tf.browser.fromPixels(img).expandDims(0) as tf.Tensor4D;
  }

  if (isHTMLImageElement(pixels)) {
    return tf.browser.fromPixels(pixels).expandDims(0) as tf.Tensor4D;
  }

  if (isFourDimensionalTensor(pixels)) {
    return pixels;
  }

  if (pixels.shape.length === 3) {
    return pixels.expandDims(0) as tf.Tensor4D;
  }

  throw new Error(
    [
      `Unsupported dimensions for incoming pixels: ${pixels.shape.length}.`,
      'Only 3 or 4 dimension tensors are supported.',
    ].join(' '),
  );
};
