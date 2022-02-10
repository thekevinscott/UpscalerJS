import { tf, } from './dependencies.generated';
import { IUpscaleOptions, IModelDefinition, ProcessFn, } from './types';
import { getImageAsPixels, } from './image.generated';
import tensorAsBase64 from 'tensor-as-base64';
import { warn, } from './utils';
import { ImageInput, } from './image.browser';

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
  const [height, width,] = getWidthAndHeight(pixels);

  return {
    rows: Math.ceil(height / patchSize),
    columns: Math.ceil(width / patchSize),
  };
};

// check that padding has not pushed our origins off the board
const checkAndAdjustStartingPosition = (
  dimension: number,
  origin: [number, number],
  sliceOrigin: [number, number],
) => {
  // check that our origin is not off the board.
  if (origin[dimension] < 0) {
    // first, find out how much it overhangs
    const amount = 0 - origin[dimension];

    // then, increase origin by that amount (could also just set it to 0.)
    origin[dimension] += amount;

    // and increase sliceOrigin to accommodate
    sliceOrigin[dimension] -= amount;
  }
};

const checkAndAdjustEndingPosition = (
  size: number,
  dimension: number,
  endPosition: [number, number],
  origin: [number, number],
  sliceOrigin: [number, number],
  sliceEndPosition: [number, number],
) => {
  // check that our final positions are not off the board
  if (endPosition[dimension] > size) {
    // box overhangs in the y direction, bring origin back and cut off the appropriate section.

    // first determine the amount of overhang
    const amount = endPosition[dimension] - size;

    let compensatingAmount = 0;
    if (origin[dimension] - amount < 0) {
      compensatingAmount = 0 - (origin[dimension] - amount);
    }

    // reduce origin to accommodate overhang
    origin[dimension] -= amount - compensatingAmount;

    // then, reduce endPosition by the same amount.
    endPosition[dimension] -= amount;

    // then, increase sliceOrigin amount
    const sliceAmount = amount - compensatingAmount;
    sliceOrigin[dimension] += sliceAmount;
    sliceEndPosition[dimension] += sliceAmount;
  }
};

const checkAndAdjustSliceSize = (
  dimension: number,
  size: [number, number],
  sliceEndPosition: [number, number],
) => {
  if (sliceEndPosition[dimension] > size[dimension]) {
    sliceEndPosition[dimension] = size[dimension];
  }
};

export const getTensorDimensions = ({
  row,
  col,
  patchSize,
  height,
  width,
  padding = 0,
}: {
  row: number;
  col: number;
  patchSize: number;
  height: number;
  width: number;
  padding?: number;
}) => {
  // non typescript code can call this function, so we add runtime
  // checks to ensure required values are present
  if (row === undefined) {
    throw new Error('row is undefined');
  }
  if (col === undefined) {
    throw new Error('col is undefined');
  }
  if (patchSize === undefined) {
    throw new Error('patchSize is undefined');
  }
  if (height === undefined) {
    throw new Error('height is undefined');
  }
  if (width === undefined) {
    throw new Error('width is undefined');
  }
  let yPatchSize = patchSize;
  let xPatchSize = patchSize;
  if (yPatchSize > height) {
    yPatchSize = height;
  }
  if (xPatchSize > width) {
    xPatchSize = width;
  }
  const origin: [number, number] = [
    row * patchSize - padding,
    col * patchSize - padding,
  ];
  const sliceOrigin: [number, number] = [padding, padding,];

  checkAndAdjustStartingPosition(0, origin, sliceOrigin);
  checkAndAdjustStartingPosition(1, origin, sliceOrigin);

  const endPosition: [number, number] = [
    origin[0] + yPatchSize + padding * 2,
    origin[1] + xPatchSize + padding * 2,
  ];
  const sliceEndPosition: [number, number] = [
    sliceOrigin[0] + yPatchSize,
    sliceOrigin[1] + xPatchSize,
  ];

  checkAndAdjustEndingPosition(
    height,
    0,
    endPosition,
    origin,
    sliceOrigin,
    sliceEndPosition,
  );
  checkAndAdjustEndingPosition(
    width,
    1,
    endPosition,
    origin,
    sliceOrigin,
    sliceEndPosition,
  );

  const size: [number, number] = [
    endPosition[0] - origin[0],
    endPosition[1] - origin[1],
  ];

  checkAndAdjustSliceSize(0, size, sliceEndPosition);
  checkAndAdjustSliceSize(1, size, sliceEndPosition);
  const sliceSize: [number, number] = [
    sliceEndPosition[0] - sliceOrigin[0],
    sliceEndPosition[1] - sliceOrigin[1],
  ];

  return {
    origin,
    sliceOrigin,
    size,
    sliceSize,
  };
};

export const predict = async (
  model: tf.LayersModel,
  pixels: tf.Tensor4D,
  modelDefinition: IModelDefinition,
  { progress, patchSize, padding, }: IUpscaleOptions = {},
): Promise<tf.Tensor3D> => {
  const scale = modelDefinition.scale;

  if (patchSize) {
    if (padding === undefined) {
      warn([
        '"padding" is undefined, but "patchSize" is explicitly defined.',
        'Without padding, patches of images often have visible artifacting at the seams. Defining an explicit padding will resolve the artifacting.',
        `For more information, see ${ERROR_UNDEFINED_PADDING}.`,
        'To hide this warning, pass an explicit padding of "0".',
      ]);
    }
    const channels = 3;
    const [height, width,] = pixels.shape.slice(1);
    const { rows, columns, } = getRowsAndColumns(pixels, patchSize);
    const { size: originalSize, } = getTensorDimensions({
      row: 0,
      col: 0,
      patchSize,
      height,
      width,
      padding,
    });
    let upscaledTensor: tf.Tensor4D = tf.zeros([
      1,
      0,
      originalSize[1] * scale,
      channels,
    ]);
    const total = rows * columns;
    for (let row = 0; row < rows; row++) {
      let colTensor: tf.Tensor4D = tf.zeros([
        1,
        originalSize[0] * scale,
        0,
        channels,
      ]);
      for (let col = 0; col < columns; col++) {
        const { origin, size, sliceOrigin, sliceSize, } = getTensorDimensions({
          row,
          col,
          patchSize,
          padding,
          height,
          width,
        });
        const slicedPixels = pixels.slice(
          [0, origin[0], origin[1],],
          [-1, size[0], size[1],],
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
          [0, sliceOrigin[0] * scale, sliceOrigin[1] * scale,],
          [-1, sliceSize[0] * scale, sliceSize[1] * scale,],
        );
        await tf.nextFrame();
        prediction.dispose();
        await tf.nextFrame();

        colTensor = colTensor.concat(slicedPrediction, 2);
        await tf.nextFrame();
        slicedPrediction.dispose();
        await tf.nextFrame();
      }

      upscaledTensor = upscaledTensor.concat(colTensor, 1);
      await tf.nextFrame();
      colTensor.dispose();
      await tf.nextFrame();
    }
    return upscaledTensor.squeeze() ;
  }

  return tf.tidy(() => {
    const pred = model.predict(pixels) as tf.Tensor4D;
    if (progress) {
      progress(1);
    }
    return pred.squeeze() ;
  });
};

function getProcessedPixels<T extends tf.Tensor>(
  processFn: undefined | ProcessFn<T>,
  upscaledTensor: T,
): T {
  if (processFn) {
    const postprocessedPixels = processFn(upscaledTensor);
    upscaledTensor.dispose();
    return postprocessedPixels;
  }
  return upscaledTensor;
}

const upscale = async (
  model: tf.LayersModel,
  image: ImageInput,
  modelDefinition: IModelDefinition,
  options: IUpscaleOptions = {},
) => {
  const { tensor: pixels, canDispose, } = await getImageAsPixels(image);

  const preprocessedPixels = getProcessedPixels<tf.Tensor4D>(
    modelDefinition.preprocess,
    pixels,
  );

  const upscaledTensor = await predict(
    model,
    preprocessedPixels,
    modelDefinition,
    options,
  );

  const postprocessedPixels = getProcessedPixels<tf.Tensor3D>(
    modelDefinition.postprocess,
    upscaledTensor,
  );

  if (canDispose) {
    // canDispose indicates we can safely dispose of the tensor.
    // the only case where we _can't_ safely dispose is when we are using
    // the original tensor, when it is already in the expected format we need (a rank 4 tensor).
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
