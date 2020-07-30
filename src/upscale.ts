import * as tf from '@tensorflow/tfjs';
import { IUpscaleOptions } from './types';

export const predict = async (
  model: tf.LayersModel,
  pixels: tf.Tensor4D,
): Promise<tf.Tensor3D> => {
  const pred = (await model.predict(pixels)) as tf.Tensor4D;
  return pred.squeeze() as tf.Tensor3D;
};

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.src = src;
    img.onload = () => resolve(img);
    img.onerror = reject;
  });

const isString = (pixels: any): pixels is string => {
  return typeof pixels === 'string';
};

const isHTMLImageElement = (pixels: any): pixels is HTMLImageElement => {
  try {
    return pixels instanceof HTMLImageElement;
  } catch (err) {
    // may be in a webworker, or in Node
    return false;
  }
};

const isFourDimensionalTensor = (pixels: tf.Tensor): pixels is tf.Tensor4D => {
  return pixels.shape.length === 4;
};

const getPixels = async (
  pixels: string | HTMLImageElement | tf.Tensor,
): Promise<tf.Tensor4D> => {
  if (isString(pixels)) {
    const img = await loadImage(pixels);
    return tf.browser.fromPixels(img).expandDims(0);
  }

  if (isHTMLImageElement(pixels)) {
    return tf.browser.fromPixels(pixels).expandDims(0);
  }

  if (isFourDimensionalTensor(pixels)) {
    return pixels;
  }

  if (pixels.shape.length === 3) {
    return pixels.expandDims(0);
  }

  throw new Error(
    [
      `Unsupported dimensions for incoming pixels: ${pixels.shape.length}.`,
      'Only 3 or 4 dimension tensors are supported.',
    ].join(' '),
  );
};

const upscale = async (
  model: tf.LayersModel,
  image: string | HTMLImageElement | tf.Tensor3D,
  options: IUpscaleOptions = {},
): Promise<tf.Tensor3D | string> => {
  const pixels = await getPixels(image);
  const upscaledTensor = await predict(model, pixels as tf.Tensor4D);

  if (options.output === 'tensor') {
    return upscaledTensor;
  }

  return tensorAsBase64(upscaledTensor);
};

export const tensorAsBuffer = async (tensor: tf.Tensor3D) => {
  const [height, width] = tensor.shape;
  const buffer = new Uint8ClampedArray(width * height * 4);
  const imageData = new ImageData(width, height);
  const data = await tensor.data();
  let i = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pos = (y * width + x) * 4; // position in buffer based on x and y
      buffer[pos] = data[i]; // some R value [0, 255]
      buffer[pos + 1] = data[i + 1]; // some G value
      buffer[pos + 2] = data[i + 2]; // some B value
      buffer[pos + 3] = 255; // set alpha channel
      i += 3;
    }
  }
  imageData.data.set(buffer);
  return imageData;
};

export const tensorAsBase64 = async (tensor: tf.Tensor3D) => {
  const [height, width] = tensor.shape;
  const imageData = await tensorAsBuffer(tensor);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL();
};

export default upscale;
