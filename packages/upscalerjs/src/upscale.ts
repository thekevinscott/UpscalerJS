import { tf, } from './dependencies.generated';
import type {
  PrivateUpscaleArgs,
  ModelPackage,
  BASE64,
  TENSOR,
  YieldedIntermediaryValue,
 } from './types';
import { checkValidEnvironment, getImageAsTensor, tensorAsBase64, Input, } from './image.generated';
import {
  wrapGenerator,
  warn,
  isProgress,
  isMultiArgTensorProgress,
  processAndDisposeOfTensor,
  isSingleArgProgress,
  nonNullable,
} from './utils';
import {
  parsePatchAndInputShapes,
} from './model-utils';
import {
  scaleIncomingPixels,
  padInput,
  trimInput,
  scaleOutput,
  getWidthAndHeight,
} from './tensor-utils';
import {
  isTensor,
  isFourDimensionalTensor,
  FixedShape4D,
 } from '@upscalerjs/core';
import { makeTick, } from './makeTick';
import { GraphModel, LayersModel, } from '@tensorflow/tfjs';
import {
  ERROR_INVALID_MODEL_PREDICTION,
  ERROR_INVALID_TENSOR_PREDICTED,
  GET_INVALID_ROW_OR_COLUMN,
  GET_TENSOR_DIMENSION_ERROR_COL_IS_UNDEFINED,
  GET_TENSOR_DIMENSION_ERROR_HEIGHT_IS_UNDEFINED,
  GET_TENSOR_DIMENSION_ERROR_PATCH_SIZE_IS_UNDEFINED,
  GET_TENSOR_DIMENSION_ERROR_ROW_IS_UNDEFINED,
  GET_TENSOR_DIMENSION_ERROR_WIDTH_IS_UNDEFINED,
  GET_UNDEFINED_TENSORS_ERROR,
  WARNING_PROGRESS_WITHOUT_PATCH_SIZE,
} from './errors-and-warnings';

export const getRowsAndColumns = (
  pixels: tf.Tensor3D | tf.Tensor4D,
  patchSize: number,
): {
  rows: number;
  columns: number;
} => {
  const [height, width,] = getWidthAndHeight(pixels);

  const rows = Math.ceil(height / patchSize);
  const columns = Math.ceil(width / patchSize);

  if (rows <= 0) {
    throw GET_INVALID_ROW_OR_COLUMN('rows', rows, patchSize, height);
  }
  if (columns <= 0) {
    throw GET_INVALID_ROW_OR_COLUMN('columns', columns, patchSize, width);
  }

  return {
    rows,
    columns,
  };
};

// check that padding has not pushed our origins off the board
// mutating function
const checkAndAdjustStartingPosition = (
  dimension: number,
  origin: [number, number],
  sliceOrigin: [number, number],
): void => {
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

// mutating function
const checkAndAdjustEndingPosition = (
  size: number,
  dimension: number,
  endPosition: [number, number],
  origin: [number, number],
  sliceOrigin: [number, number],
  sliceEndPosition: [number, number],
): void => {
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

// mutating function
const checkAndAdjustSliceSize = (
  dimension: number,
  size: [number, number],
  sliceEndPosition: [number, number],
): void => {
  if (sliceEndPosition[dimension] > size[dimension]) {
    sliceEndPosition[dimension] = size[dimension];
  }
};

export interface GetTensorDimensionsOpts {
  row: number;
  col: number;
  patchSize: number;
  height: number;
  width: number;
  padding?: number;
}

export const getTensorDimensions = ({
  row,
  col,
  patchSize,
  height,
  width,
  padding = 0,
}: GetTensorDimensionsOpts) => {
  // non typescript code can call this function, so we add runtime
  // checks to ensure required values are present
  if (row === undefined) {
    throw GET_TENSOR_DIMENSION_ERROR_ROW_IS_UNDEFINED;
  }
  if (col === undefined) {
    throw GET_TENSOR_DIMENSION_ERROR_COL_IS_UNDEFINED;
  }
  if (patchSize === undefined) {
    throw GET_TENSOR_DIMENSION_ERROR_PATCH_SIZE_IS_UNDEFINED;
  }
  if (height === undefined) {
    throw GET_TENSOR_DIMENSION_ERROR_HEIGHT_IS_UNDEFINED;
  }
  if (width === undefined) {
    throw GET_TENSOR_DIMENSION_ERROR_WIDTH_IS_UNDEFINED;
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

export function concatTensors<T extends tf.Tensor3D | tf.Tensor4D> (tensors: Array<T | undefined>, axis = 0): T {
  const definedTensors: Array<tf.Tensor3D | tf.Tensor4D> = tensors.filter(nonNullable);
  if (definedTensors.length === 0) {
    throw GET_UNDEFINED_TENSORS_ERROR();
  }
  const concatenatedTensor = tf.concat(definedTensors, axis);
  tensors.forEach(tensor => tensor?.dispose());
  return concatenatedTensor as T;
}

export const getPercentageComplete = (row: number, col: number, columns: number, total: number) => {
  const index = row * columns + col + 1;
  const percent = index / total;
  return percent;
};

export const executeModel = (model: LayersModel | GraphModel, pixels: tf.Tensor4D): tf.Tensor4D => {
  const predictedPixels = model.predict(pixels);
  if (!isTensor(predictedPixels)) {
    throw new Error(ERROR_INVALID_MODEL_PREDICTION);
  }
  if (isFourDimensionalTensor(predictedPixels)) {
    return predictedPixels;
  }

  throw new Error(ERROR_INVALID_TENSOR_PREDICTED(predictedPixels.shape));
};

/* eslint-disable @typescript-eslint/require-await */
export async function* processPixels(
  pixels: tf.Tensor4D,
  { output, progress, progressOutput, }: Pick<PrivateUpscaleArgs, 'output' | 'progress' | 'progressOutput'>,
  modelPackage: ModelPackage,
  {
    imageSize,
    patchSize,
    padding,
  }: {
    imageSize: FixedShape4D;
  } & Pick<PrivateUpscaleArgs, 'patchSize' | 'padding'>
): AsyncGenerator<YieldedIntermediaryValue, tf.Tensor3D> {
  const { model, modelDefinition, } = modelPackage;
  const scale = modelDefinition.scale || 1;

  if (patchSize) {
    const [height, width,] = pixels.shape.slice(1);
    const { rows, columns, } = getRowsAndColumns(pixels, patchSize);
    yield;
    let upscaledTensor: undefined | tf.Tensor4D;
    const total = rows * columns;
    for (let row = 0; row < rows; row++) {
      let colTensor: undefined | tf.Tensor4D;
      yield [colTensor, upscaledTensor,];
      for (let col = 0; col < columns; col++) {
        const { origin, size, sliceOrigin, sliceSize, } = getTensorDimensions({
          row,
          col,
          patchSize,
          padding,
          height,
          width,
        });
        yield [upscaledTensor, colTensor,];
        const slicedPixels = pixels.slice(
          [0, origin[0], origin[1],],
          [-1, size[0], size[1],],
        );
        yield [upscaledTensor, colTensor, slicedPixels,];
        const prediction = executeModel(model, slicedPixels);
        slicedPixels.dispose();
        yield [upscaledTensor, colTensor, prediction,];

        const startSlice = [0, sliceOrigin[0] * scale, sliceOrigin[1] * scale,];
        const endSlice = [-1, sliceSize[0] * scale, sliceSize[1] * scale,];
        const slicedPrediction = prediction.slice(
          startSlice, endSlice,
        );
        prediction.dispose();
        yield [upscaledTensor, colTensor, slicedPrediction,];
        const processedPrediction = processAndDisposeOfTensor(slicedPrediction, modelDefinition.postprocess, scaleOutput(modelDefinition.outputRange));
        yield [upscaledTensor, colTensor, processedPrediction,];

        if (progress !== undefined && isProgress(progress)) {
          const percent = getPercentageComplete(row, col, columns, total);
          if (isSingleArgProgress(progress)) {
            progress(percent);
          } else {
            /* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
            const squeezedTensor = processedPrediction.squeeze() as tf.Tensor3D;
            if (isMultiArgTensorProgress(progress, output, progressOutput)) {
              // because we are returning a tensor, we cannot safely dispose of it
              progress(percent, squeezedTensor, row, col);
            } else {
              // because we are returning a string, we can safely dispose of our tensor
              const src = tensorAsBase64(squeezedTensor);
              squeezedTensor.dispose();
              progress(percent, src, row, col);
            }
          }
        }
        yield [upscaledTensor, colTensor, processedPrediction,];

        colTensor = concatTensors<tf.Tensor4D>([colTensor, processedPrediction,], 2);
        processedPrediction.dispose();
        yield [upscaledTensor, colTensor,];
      }

      upscaledTensor = concatTensors<tf.Tensor4D>([upscaledTensor, colTensor,], 1);

      /* eslint-disable @typescript-eslint/no-non-null-assertion */
      colTensor!.dispose();
      yield [upscaledTensor,];
    }
    // https://github.com/tensorflow/tfjs/issues/1125
    /* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
    /* eslint-disable @typescript-eslint/no-non-null-assertion */
    const processedUpscaledTensor = processAndDisposeOfTensor(
      upscaledTensor!.clone(),
      trimInput(imageSize, scale)
    );
    upscaledTensor?.dispose();
    yield [processedUpscaledTensor,];

    const squeezedTensor = processedUpscaledTensor!.squeeze() as tf.Tensor3D;
    /* eslint-disable @typescript-eslint/no-non-null-assertion */
    processedUpscaledTensor!.dispose();
    return squeezedTensor;
  }

  if (progress) {
    warn(WARNING_PROGRESS_WITHOUT_PATCH_SIZE);
  }

  const prediction = executeModel(model, pixels);
  yield [prediction,];
  const postprocessedTensor = processAndDisposeOfTensor(
    prediction.clone(),
    modelDefinition.postprocess,
    scaleOutput(modelDefinition.outputRange),
    trimInput(imageSize, scale)
  );

  prediction.dispose();
  yield [postprocessedTensor,];

  // https://github.com/tensorflow/tfjs/issues/1125
  /* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
  const squeezedTensor = postprocessedTensor.squeeze() as tf.Tensor3D;
  postprocessedTensor.dispose();
  return squeezedTensor;
}

// if given a tensor, we copy it; otherwise, we pass input through unadulterated
// this allows us to safely dispose of memory ourselves without having to manage
// what input is in which format
export const getCopyOfInput = (input: Input): Input => (isTensor(input) ? input.clone() : input);

export function upscale(
  input: Input,
  args: Omit<PrivateUpscaleArgs, 'output'> & {
    output: BASE64;
  },
  modelPackage: ModelPackage,
  ): AsyncGenerator<YieldedIntermediaryValue, string>;
export function upscale(
  input: Input,
  args: Omit<PrivateUpscaleArgs, 'output'> & {
    output: TENSOR;
  },
  modelPackage: ModelPackage,
  ): AsyncGenerator<YieldedIntermediaryValue, tf.Tensor3D>;
export function upscale(
  input: Input,
  args: Omit<PrivateUpscaleArgs, 'output'> & {
    output: BASE64 | TENSOR;
  },
  modelPackage: ModelPackage,
  ): AsyncGenerator<YieldedIntermediaryValue, string | tf.Tensor3D>;
export async function* upscale(
  input: Input,
  args: Omit<PrivateUpscaleArgs, 'output'> & {
    output: BASE64 | TENSOR;
  },
  modelPackage: ModelPackage,
): AsyncGenerator<YieldedIntermediaryValue, string | tf.Tensor3D> {
  const parsedInput = getCopyOfInput(input);
  const startingPixels = await getImageAsTensor(parsedInput);
  yield startingPixels;

  const imageSize = startingPixels.shape;

  // retrieve the patch size and padding. If the model definition has defined its own input shape,
  // then that input shape will override the user's variables.
  const { patchSize, padding, modelInputShape, } = parsePatchAndInputShapes(modelPackage, args, imageSize);

  const preprocessedPixels = processAndDisposeOfTensor(
    startingPixels,
    modelPackage.modelDefinition.preprocess,
    scaleIncomingPixels(modelPackage.modelDefinition.inputRange),
    modelInputShape ? padInput(modelInputShape) : undefined,
  );
  yield preprocessedPixels;

  const gen = processPixels(
    preprocessedPixels,
    args,
    modelPackage,
    {
      imageSize,
      patchSize,
      padding,
    }
  );
  let result = await gen.next();
  yield result.value;
  while (!result.done) {
    result = await gen.next();
    if (Array.isArray(result.value)) {
      yield [...result.value, preprocessedPixels,];
    } else if (isTensor(result.value)) {
      yield [result.value, preprocessedPixels,];
    } else {
      yield preprocessedPixels;
    }
  }
  preprocessedPixels.dispose();
  const upscaledPixels: tf.Tensor3D = result.value;

  if (args.output === 'tensor') {
    return upscaledPixels;
  }

  const base64Src = tensorAsBase64(upscaledPixels);
  upscaledPixels.dispose();
  return base64Src;
}

export function cancellableUpscale(
  input: Input,
  { signal, awaitNextFrame, ...args }: Omit<PrivateUpscaleArgs, 'output'> & { output: TENSOR},
  internalArgs: ModelPackage & {
    signal: AbortSignal;
  },
  ): Promise<tf.Tensor3D>;
export function cancellableUpscale(
  input: Input,
  { signal, awaitNextFrame, ...args }: Omit<PrivateUpscaleArgs, 'output'> & { output: BASE64},
  internalArgs: ModelPackage & {
    signal: AbortSignal;
  },
): Promise<string>;
export function cancellableUpscale(
  input: Input,
  { signal, awaitNextFrame, ...args }: Omit<PrivateUpscaleArgs, 'output'> & { output: BASE64 | TENSOR },
  internalArgs: ModelPackage & {
    signal: AbortSignal;
  },
): Promise<tf.Tensor3D | string>;
export async function cancellableUpscale(
  input: Input,
  { signal, awaitNextFrame, ...args }: Omit<PrivateUpscaleArgs, 'output'> & { output: BASE64 | TENSOR},
  internalArgs: ModelPackage & {
    signal: AbortSignal;
  },
) {
  checkValidEnvironment(input, {
    output: args.output,
    progressOutput: args.progressOutput,
  });
  const tick = makeTick(signal || internalArgs.signal, awaitNextFrame);
  await tick();
  const upscaledPixels = await wrapGenerator(upscale(
    input,
    args,
    internalArgs,
  ), tick);
  await tick();
  return upscaledPixels;
}
