import * as tf from '@tensorflow/tfjs-node';
import { IUpscaleOptions } from './types';

export const predict = async (
  model: tf.LayersModel,
  pixels: tf.Tensor3D,
): Promise<tf.Tensor3D> => {
  const pred = (await model.predict(pixels.expandDims(0))) as tf.Tensor4D;
  return pred.squeeze() as tf.Tensor3D;
};

const upscale = async (
  model: tf.LayersModel,
  pixels: tf.Tensor3D,
  options: IUpscaleOptions = {},
): Promise<tf.Tensor3D | string> => {
  const upscaledTensor = await predict(model, pixels.expandDims(0));
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
