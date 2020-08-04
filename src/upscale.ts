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
  height: number,
  width: number,
) => {
  let originRowPadding = padding;
  let originColPadding = padding;
  let sizeHeightPadding = padding;
  let sizeWidthPadding = padding;
  const origin = [
    row * patchSize - originRowPadding,
    col * patchSize - originColPadding,
  ];
  if (origin[0] < 0) {
    originRowPadding = padding - (0 - origin[0]);
    origin[0] = 0;
  }
  if (origin[1] < 0) {
    originColPadding = padding - (0 - origin[1]);
    origin[1] = 0;
  }
  const endPosition = [
    row * patchSize + patchSize + sizeHeightPadding,
    col * patchSize + patchSize + sizeWidthPadding,
  ];
  if (endPosition[0] > height) {
    sizeHeightPadding = padding - (endPosition[0] - height);
    if (sizeHeightPadding < 0) {
      sizeHeightPadding = 0;
    }
    endPosition[0] = height;
  }
  if (endPosition[1] > width) {
    sizeWidthPadding = padding - (endPosition[1] - width);
    if (sizeWidthPadding < 0) {
      sizeWidthPadding = 0;
    }
    endPosition[1] = width;
  }
  const size = [endPosition[0] - origin[0], endPosition[1] - origin[1]];
  const sliceOrigin = [originRowPadding, originColPadding];
  const sliceSize = [
    size[0] - sliceOrigin[0] - sizeHeightPadding,
    size[1] - sliceOrigin[1] - sizeWidthPadding,
  ];

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
  { patchSize, padding = 0 }: IUpscaleOptions = {},
): Promise<tf.Tensor3D> => {
  if (patchSize) {
    let pred: tf.Tensor4D;
    const { rows, columns } = getRowsAndColumns(pixels, patchSize);
    const [_, height, width] = pixels.shape;
    for (let row = 0; row < rows; row++) {
      let colTensor: tf.Tensor4D;
      for (let col = 0; col < columns; col++) {
        const { origin, size, sliceOrigin, sliceSize } = getTensorDimensions(
          row,
          col,
          patchSize,
          padding,
          height,
          width,
        );
        const slicedPixels = pixels.slice(
          [0, origin[0], origin[1]],
          [-1, size[0], size[1]],
        );
        const prediction = model.predict(slicedPixels) as tf.Tensor4D;
        await tf.nextFrame();
        slicedPixels.dispose();
        const slicedPrediction = prediction.slice(
          [0, sliceOrigin[0] * scale, sliceOrigin[1] * scale],
          [-1, sliceSize[0] * scale, sliceSize[1] * scale],
        );
        prediction.dispose();

        if (!colTensor) {
          colTensor = slicedPrediction;
        } else {
          colTensor = colTensor.concat(slicedPrediction, 2);
          slicedPrediction.dispose();
        }
      }
      if (!pred) {
        pred = colTensor;
      } else {
        pred = pred.concat(colTensor, 1);
        colTensor.dispose();
      }
    }
    if (!pred) {
      throw new Error('Prediction tensor was never initialized.');
    }
    assert(
      pred.shape ===
        [pixels.shape[0], height * scale, width * scale, pixels.shape[3]],
    );
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
