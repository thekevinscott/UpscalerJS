import * as tf from '@tensorflow/tfjs';
import { IUpscaleOptions, IModelDefinition } from './types';
import { getImageAsPixels } from './image';
import tensorAsBase64 from 'tensor-as-base64';

const ERROR_UNDEFINED_PADDING =
  'https://thekevinscott.github.io/UpscalerJS/#/?id=padding-is-undefined';

const getWidthAndHeight = (tensor: tf.Tensor3D | tf.Tensor4D) => {
  if (tensor.shape.length === 4) {
    return tensor.shape.slice(1, 3);
  }

  if (tensor.shape.length === 3) {
    return tensor.shape.slice(0, 2);
  }

  throw new Error(
    `Invalid shape provided to getWidthAndHeight, expected tensor of rank 3 or 4: ${JSON.stringify(
      tensor.shape,
    )}`,
  );
};

export const getRowsAndColumns = (
  pixels: tf.Tensor3D | tf.Tensor4D,
  patchSize: number,
): {
  rows: number;
  columns: number;
} => {
  const [height, width] = getWidthAndHeight(pixels);

  return {
    rows: Math.ceil(height / patchSize),
    columns: Math.ceil(width / patchSize),
  };
};

export const getTensorDimensions = (
  row: number,
  col: number,
  patchSize: number,
  padding: number = 0,
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
  modelDefinition: IModelDefinition,
  { progress, patchSize, padding }: IUpscaleOptions = {},
): Promise<tf.Tensor3D> => {
  const scale = modelDefinition.scale;
  if (patchSize) {
    if (padding === undefined) {
      console.warn(
        [
          '"padding" is undefined, but "patchSize" is explicitly defined.',
          'Without padding, patches of images often have visible artifacting at the seams. Defining an explicit padding will resolve the artifacting.',
          `For more information, see ${ERROR_UNDEFINED_PADDING}.`,
          'To hide this warning, pass an explicit padding of "0".',
        ].join('\n'),
      );
    }
    let pred: tf.Tensor4D;
    const { rows, columns } = getRowsAndColumns(pixels, patchSize);
    const [_, height, width] = pixels.shape;
    const total = rows * columns;
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
        await tf.nextFrame();
        const prediction = model.predict(slicedPixels) as tf.Tensor4D;
        await tf.nextFrame();
        slicedPixels.dispose();
        await tf.nextFrame();
        if (progress) {
          const index = row * columns + col + 1;
          progress(index / total);
        }
        const slicedPrediction = prediction.slice(
          [0, sliceOrigin[0] * scale, sliceOrigin[1] * scale],
          [-1, sliceSize[0] * scale, sliceSize[1] * scale],
        );
        await tf.nextFrame();
        prediction.dispose();
        await tf.nextFrame();

        if (!colTensor) {
          colTensor = slicedPrediction;
        } else {
          colTensor = colTensor.concat(slicedPrediction, 2);
          await tf.nextFrame();
          slicedPrediction.dispose();
        }
        await tf.nextFrame();
      }
      if (!pred) {
        pred = colTensor;
      } else {
        pred = pred.concat(colTensor, 1);
        await tf.nextFrame();
        colTensor.dispose();
      }
      await tf.nextFrame();
    }
    if (!pred) {
      throw new Error('Prediction tensor was never initialized.');
    }
    return pred.squeeze() as tf.Tensor3D;
  }

  return tf.tidy(() => {
    const pred = model.predict(pixels) as tf.Tensor4D;
    if (progress) {
      progress(1);
    }
    return pred.squeeze() as tf.Tensor3D;
  });
};

const upscale = async (
  model: tf.LayersModel,
  image: string | HTMLImageElement | tf.Tensor3D,
  modelDefinition: IModelDefinition,
  options: IUpscaleOptions = {},
) => {
  const { tensor: pixels, type } = await getImageAsPixels(image);
  let preprocessedPixels: tf.Tensor4D;
  if (modelDefinition.preprocess) {
    preprocessedPixels = modelDefinition.preprocess(pixels);
    pixels.dispose();
  } else {
    preprocessedPixels = pixels;
  }
  const upscaledTensor = await predict(
    model,
    preprocessedPixels,
    modelDefinition,
    options,
  );
  let postprocessedPixels: tf.Tensor3D;
  if (modelDefinition.postprocess) {
    postprocessedPixels = modelDefinition.postprocess(upscaledTensor);
    upscaledTensor.dispose();
  } else {
    postprocessedPixels = upscaledTensor;
  }

  if (type !== 'tensor') {
    // if not a tensor, release the memory, since we retrieved it from a string or HTMLImageElement
    // if it is a tensor, it is user provided and thus should not be disposed of.
    pixels.dispose();
  }

  if (options.output === 'tensor') {
    return postprocessedPixels as tf.Tensor;
  }

  const base64Src = tensorAsBase64(postprocessedPixels);
  postprocessedPixels.dispose();
  return base64Src;
};

export default upscale;
