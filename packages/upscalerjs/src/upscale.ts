import { tf, } from './dependencies.generated';
import type {
  PrivateUpscaleArgs,
  ModelPackage,
  BASE64,
  TENSOR,
  YieldedIntermediaryValue,
 } from './types';
import {
  checkValidEnvironment,
  getImageAsTensor,
  tensorAsBase64,
  Input,
} from './image.generated';
import {
  wrapGenerator,
  warn,
  isProgress,
  isMultiArgTensorProgress,
  processAndDisposeOfTensor,
  isSingleArgProgress,
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
  getTensorDimensions,
  concatTensors,
  getCopyOfInput,
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
        const {
          preprocessedCoordinates,
          postprocessedCoordinates: {
            origin: sliceOrigin,
            size: sliceSize,
          },
        } = getTensorDimensions({
          row,
          col,
          patchSize,
          padding,
          height,
          width,
        });
        yield [upscaledTensor, colTensor,];
        const slicedPixels = pixels.slice(
          [0, ...preprocessedCoordinates.origin,],
          [-1, ...preprocessedCoordinates.size,],
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
