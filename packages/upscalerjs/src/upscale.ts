import type { Tensor3D, Tensor4D, } from '@tensorflow/tfjs-core';
import type {
  PrivateUpscaleArgs,
  ModelPackage,
  BASE64,
  TENSOR,
  YieldedIntermediaryValue,
  SliceData,
  CheckValidEnvironment,
  GetImageAsTensor,
  TensorAsBase64,
 } from './types';
import {
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
  concatTensors,
  getCopyOfInput,
} from './tensor-utils';
import {
  isTensor,
  isFourDimensionalTensor,
  FixedShape4D,
  TF,
 } from '@upscalerjs/core';
import { makeTick, } from './makeTick';
import { GraphModel, LayersModel, } from '@tensorflow/tfjs';
import {
  ERROR_INVALID_MODEL_PREDICTION,
  ERROR_INVALID_TENSOR_PREDICTED,
  WARNING_PROGRESS_WITHOUT_PATCH_SIZE,
} from './errors-and-warnings';
import {
  getPatchesFromImage,
} from './image-utils';

export const getPercentageComplete = (row: number, col: number, columns: number, total: number) => {
  const index = row * columns + col + 1;
  const percent = index / total;
  return percent;
};

export const executeModel = (model: LayersModel | GraphModel, pixels: Tensor4D): Tensor4D => {
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
  tf: TF,
  pixels: Tensor4D,
  { output, progress, progressOutput, }: Pick<PrivateUpscaleArgs, 'output' | 'progress' | 'progressOutput'>,
  modelPackage: ModelPackage,
  {
    originalImageSize,
    patchSize,
    padding = 0,
  }: {
    originalImageSize: FixedShape4D;
  } & Pick<PrivateUpscaleArgs, 'patchSize' | 'padding'>
  } & Pick<PrivateUpscaleArgs, 'patchSize' | 'padding'>,
  {
    tensorAsBase64,
  }: Pick<InternalConfig<Input>, 'tensorAsBase64'>
): AsyncGenerator<YieldedIntermediaryValue, Tensor3D> {
  const { model, modelDefinition, } = modelPackage;
  const scale = modelDefinition.scale ?? 1;

  if (patchSize) {
    const [height, width,] = pixels.shape.slice(1);
    const patches = getPatchesFromImage([width, height,], patchSize, padding);
    yield;
    let upscaledTensor: undefined | Tensor4D;
    const total = patches.length * patches[0].length;
    for (let rowIdx = 0; rowIdx < patches.length; rowIdx++) {
      const row = patches[rowIdx];
      const columns = row.length;
      let colTensor: undefined | Tensor4D;
      yield [colTensor, upscaledTensor,];
      for (let colIdx = 0; colIdx < columns; colIdx++) {
        const { pre, post, } = row[colIdx];
        yield [upscaledTensor, colTensor,];
        const slicedPixels = pixels.slice(
          [0, ...pre.origin,],
          [-1, ...pre.size,],
        );
        yield [upscaledTensor, colTensor, slicedPixels,];
        const prediction = executeModel(model, slicedPixels);
        slicedPixels.dispose();
        yield [upscaledTensor, colTensor, prediction,];

        const startSlice = [0, post.origin[0] * scale, post.origin[1] * scale,];
        const endSlice = [-1, post.size[0] * scale, post.size[1] * scale,];
        const slicedPrediction = prediction.slice(
          startSlice, endSlice,
        );
        prediction.dispose();
        yield [upscaledTensor, colTensor, slicedPrediction,];
        const processedPrediction = processAndDisposeOfTensor(tf, slicedPrediction, modelDefinition.postprocess, scaleOutput(modelDefinition.outputRange));
        yield [upscaledTensor, colTensor, processedPrediction,];

        if (progress !== undefined && isProgress(progress)) {
          const percent = getPercentageComplete(rowIdx, colIdx, columns, total);
          if (isSingleArgProgress(progress)) {
            progress(percent);
          } else {
            /* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
            const squeezedTensor = processedPrediction.squeeze() as Tensor3D;
            const sliceData: SliceData = {
              row: rowIdx,
              col: colIdx,
              patchCoordinates: {
                pre,
                post,
              },
            };
            if (isMultiArgTensorProgress(progress, output, progressOutput)) {
              // because we are returning a tensor, we cannot safely dispose of it
              progress(percent, squeezedTensor, sliceData);
            } else {
              // because we are returning a string, we can safely dispose of our tensor
              const src = tensorAsBase64(tf, squeezedTensor);
              squeezedTensor.dispose();
              progress(percent, src, sliceData);
            }
          }
        }
        yield [upscaledTensor, colTensor, processedPrediction,];

        colTensor = concatTensors<Tensor4D>(tf, [colTensor, processedPrediction,], 2);
        processedPrediction.dispose();
        yield [upscaledTensor, colTensor,];
      }

      upscaledTensor = concatTensors<Tensor4D>(tf, [upscaledTensor, colTensor,], 1);

      /* eslint-disable @typescript-eslint/no-non-null-assertion */
      colTensor!.dispose();
      yield [upscaledTensor,];
    }
    // https://github.com/tensorflow/tfjs/issues/1125
    /* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
    /* eslint-disable @typescript-eslint/no-non-null-assertion */
    const processedUpscaledTensor = processAndDisposeOfTensor(
      tf,
      upscaledTensor!.clone(),
      trimInput(tf, originalImageSize, scale)
    );
    upscaledTensor?.dispose();
    yield [processedUpscaledTensor,];

    const squeezedTensor = processedUpscaledTensor!.squeeze() as Tensor3D;
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
    tf,
    prediction.clone(),
    modelDefinition.postprocess,
    scaleOutput(modelDefinition.outputRange),
    trimInput(tf, originalImageSize, scale)
  );

  prediction.dispose();
  yield [postprocessedTensor,];

  // https://github.com/tensorflow/tfjs/issues/1125
  /* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
  const squeezedTensor = postprocessedTensor.squeeze() as Tensor3D;
  postprocessedTensor.dispose();
  return squeezedTensor;
}

export function upscale<I>(
  tf: TF,
  input: I,
  args: Omit<PrivateUpscaleArgs, 'output'> & {
    output: BASE64;
  },
  modelPackage: ModelPackage,
  internalConfig: Pick<InternalConfig<I>, 'getImageAsTensor' | 'tensorAsBase64'>
): AsyncGenerator<YieldedIntermediaryValue, string>;
export function upscale<I>(
  tf: TF,
  input: I,
  args: Omit<PrivateUpscaleArgs, 'output'> & {
    output: TENSOR;
  },
  modelPackage: ModelPackage,
  internalConfig: Pick<InternalConfig<I>, 'getImageAsTensor' | 'tensorAsBase64'>
): AsyncGenerator<YieldedIntermediaryValue, Tensor3D>;
export function upscale<I>(
  tf: TF,
  input: I,
  args: Omit<PrivateUpscaleArgs, 'output'> & {
    output: BASE64 | TENSOR;
  },
  modelPackage: ModelPackage,
  internalConfig: Pick<InternalConfig<I>, 'getImageAsTensor' | 'tensorAsBase64'>
): AsyncGenerator<YieldedIntermediaryValue, string | tf.Tensor3D>;
export async function* upscale<I>(
  tf: TF,
  input: I,
  args: Omit<PrivateUpscaleArgs, 'output'> & {
    output: BASE64 | TENSOR;
  },
  modelPackage: ModelPackage,
  {
    getImageAsTensor,
    tensorAsBase64,
  }: Pick<InternalConfig<I>, 'getImageAsTensor' | 'tensorAsBase64'>
): AsyncGenerator<YieldedIntermediaryValue, string | Tensor3D> {
  const parsedInput = getCopyOfInput<I>(input);
  const startingPixels = await getImageAsTensor(parsedInput);
  yield startingPixels;

  const imageSize = startingPixels.shape;

  // retrieve the patch size and padding. If the model definition has defined its own input shape,
  // then that input shape will override the user's variables.
  const { patchSize, padding, modelInputShape, } = parsePatchAndInputShapes(modelPackage, args, imageSize);

  const preprocessedPixels = processAndDisposeOfTensor(
    tf,
    startingPixels,
    modelPackage.modelDefinition.preprocess,
    scaleIncomingPixels(tf, modelPackage.modelDefinition.inputRange),
    modelInputShape ? padInput(tf, modelInputShape) : undefined,
  );
  yield preprocessedPixels;

  const gen = processPixels(
    tf,
    preprocessedPixels,
    {
      output: args.output,
      progressOutput: args.progressOutput,
      progress: args.progress,
    },
    modelPackage,
    {
      originalImageSize: imageSize,
      patchSize,
      padding,
    },
    {
      tensorAsBase64,
    },
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
  const upscaledPixels: Tensor3D = result.value;

  if (args.output === 'tensor') {
    return upscaledPixels;
  }

  const base64Src = tensorAsBase64(tf, upscaledPixels);
  upscaledPixels.dispose();
  return base64Src;
};

interface InternalConfig<I> {
  checkValidEnvironment: CheckValidEnvironment<I>;
  getImageAsTensor: GetImageAsTensor<I>,
  tensorAsBase64: TensorAsBase64,
}

export function cancellableUpscale(
  tf: TF,
  input: Input,
  { signal, awaitNextFrame, ...args }: Omit<PrivateUpscaleArgs, 'output'> & { output: TENSOR},
  internalArgs: ModelPackage & {
    signal: AbortSignal;
  },
  internalConfig: InternalConfig<Input>,
): Promise<Tensor3D>;
export function cancellableUpscale(
  tf: TF,
  input: Input,
  { signal, awaitNextFrame, ...args }: Omit<PrivateUpscaleArgs, 'output'> & { output: BASE64},
  internalArgs: ModelPackage & {
    signal: AbortSignal;
  },
  internalConfig: InternalConfig<Input>,
): Promise<string>;
export function cancellableUpscale(
  tf: TF,
  input: Input,
  { signal, awaitNextFrame, ...args }: Omit<PrivateUpscaleArgs, 'output'> & { output: BASE64 | TENSOR },
  internalArgs: ModelPackage & {
    signal: AbortSignal;
  },
  internalConfig: InternalConfig<Input>,
): Promise<Tensor3D | string>;
export async function cancellableUpscale(
  tf: TF,
  input: Input,
  { signal, awaitNextFrame, ...args }: Omit<PrivateUpscaleArgs, 'output'> & { output: BASE64 | TENSOR},
  internalArgs: ModelPackage & {
    signal: AbortSignal;
  },
  {
    checkValidEnvironment,
    ...internalConfig
  }: InternalConfig<Input>
) {
  checkValidEnvironment(input, {
    output: args.output,
    progressOutput: args.progressOutput,
  });
  const tick = makeTick(tf, signal || internalArgs.signal, awaitNextFrame);
  await tick();
  const upscaledPixels = await wrapGenerator(upscale(
    tf,
    input,
    args,
    internalArgs,
    internalConfig,
  ), tick);
  await tick();
  return upscaledPixels;
}
