import * as tf from '@tensorflow/tfjs';
import { IUpscaleOptions } from './types';
import { getImageAsPixels } from './image';
import tensorAsBase64 from 'tensor-as-base64';

export const getRowsAndColumns = (
  pixels: tf.Tensor4D,
  patchSize: number,
): {
  rows: number;
  columns: number;
} => {
  const [_, height, width, _2] = pixels.shape;

  return {
    rows: Math.ceil(height / patchSize),
    columns: Math.ceil(width / patchSize),
  };
};

export const getTensorDimensions = (
  row: number,
  col: number,
  patchSize: number,
  padding: number,
  scale: number,
  height: number,
  width: number,
  minimumHeight = 0,
  minimumWidth = 0,
) => {
  let originRowPadding = padding;
  let originColPadding = padding;
  let sizeHeightPadding = padding;
  let sizeWidthPadding = padding;
  const origin = [
    0,
    col * patchSize - originRowPadding,
    row * patchSize - originColPadding,
  ];
  if (origin[1] < 0) {
    origin[1] = 0;
    originRowPadding = 0;
  }
  if (origin[2] < 0) {
    origin[2] = 0;
    originColPadding = 0;
  }
  const size = [
    -1,
    origin[1] + patchSize + originRowPadding + sizeHeightPadding,
    origin[2] + patchSize + originColPadding + sizeWidthPadding,
  ];
  if (size[1] > height) {
    size[1] = height;
    sizeWidthPadding = 0;
  }
  if (size[2] > width) {
    size[2] = width;
    sizeHeightPadding = 0;
  }
  size[1] = size[1] - origin[1];
  size[2] = size[2] - origin[2];
  if (size[1] < minimumHeight + padding) {
    const diff = minimumHeight + padding - size[1];
    size[1] = minimumHeight + padding;
    origin[1] -= diff;
  }
  if (size[2] < minimumWidth + padding) {
    const diff = minimumWidth + padding - size[2];
    size[2] = minimumWidth + padding;
    origin[2] -= diff;
  }
  const sliceOrigin = [0, originRowPadding * scale, originColPadding * scale];
  const sliceSize = [
    -1,
    size[1] * scale - sliceOrigin[1],
    size[2] * scale - sliceOrigin[2],
  ];
  sliceSize[1] = sliceSize[1] - sizeWidthPadding * scale;
  sliceSize[2] = sliceSize[2] - sizeHeightPadding * scale;

  return {
    origin,
    size,
    sliceOrigin,
    sliceSize,
  };
};

export const predict = async (
  model: tf.LayersModel,
  pixels: tf.Tensor4D,
  scale: number,
  { patchSize, padding = 0, minimumPatchSize }: IUpscaleOptions = {},
): Promise<tf.Tensor3D> => {
  if (patchSize) {
    let pred: tf.Tensor4D;
    const { rows, columns } = getRowsAndColumns(pixels, patchSize);
    const [_, height, width] = pixels.shape;
    for (let row = 0; row < rows; row++) {
      let rowTensor: tf.Tensor4D;
      for (let col = 0; col < columns; col++) {
        const { origin, size, sliceOrigin, sliceSize } = getTensorDimensions(
          row,
          col,
          patchSize,
          padding,
          scale,
          height,
          width,
          minimumPatchSize,
          minimumPatchSize,
        );
        const slicedPixels = pixels.slice(origin, size);
        const slicedPrediction = (model.predict(
          slicedPixels,
        ) as tf.Tensor4D).slice(sliceOrigin, sliceSize);
        await tf.nextFrame();
        slicedPixels.dispose();

        if (!rowTensor) {
          rowTensor = slicedPrediction;
        } else {
          rowTensor = rowTensor.concat(slicedPrediction, 1);
          slicedPrediction.dispose();
        }
      }
      if (!pred) {
        pred = rowTensor;
      } else {
        pred = pred.concat(rowTensor, 2);
        rowTensor.dispose();
      }
    }
    if (!pred) {
      throw new Error('Prediction tensor was never initialized.');
    }
    return pred.squeeze() as tf.Tensor3D;
  }

  return tf.tidy(() => {
    const pred = model.predict(pixels) as tf.Tensor4D;
    return pred.squeeze() as tf.Tensor3D;
  });
};

const upscale = async (
  model: tf.LayersModel,
  image: string | HTMLImageElement | tf.Tensor3D,
  scale: number,
  options: IUpscaleOptions = {},
): Promise<tf.Tensor3D | string> => {
  const pixels = await getImageAsPixels(image);
  const upscaledTensor = await predict(
    model,
    pixels as tf.Tensor4D,
    scale,
    options,
  );
  pixels.dispose();

  if (options.output === 'tensor') {
    return upscaledTensor;
  }

  return tensorAsBase64(upscaledTensor);
};

export default upscale;
