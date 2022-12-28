import { tf, } from './dependencies.generated';
import type { 
  PrivateUpscaleArgs, 
  ModelPackage,
  BASE64,
  TENSOR,
  YieldedIntermediaryValue,
 } from './types';
import { getImageAsTensor, tensorAsBase64, GetImageAsTensorInput, } from './image.generated';
import { 
  wrapGenerator, 
  warn, 
  isTensor, 
  isProgress, 
  isMultiArgTensorProgress, 
  isThreeDimensionalTensor,
  isFourDimensionalTensor,
  processAndDisposeOfTensor,
  isSingleArgProgress,
 } from './utils';
import { makeTick, } from './makeTick';

const WARNING_UNDEFINED_PADDING_URL =
  'https://upscalerjs.com/documentation/troubleshooting#padding-is-undefined';

export const WARNING_UNDEFINED_PADDING = [
  '"padding" is undefined, but "patchSize" is explicitly defined.',
  'Without padding, patches of images often have visible artifacting at the seams. Defining an explicit padding will resolve the artifacting.',
  `For more information, see ${WARNING_UNDEFINED_PADDING_URL}.`,
  'To hide this warning, pass an explicit padding of "0".',
].join('\n');

const WARNING_PROGRESS_WITHOUT_PATCH_SIZE_URL =
  'https://upscalerjs.com/documentation/troubleshooting#progress-specified-without-patch-size';

export const WARNING_PROGRESS_WITHOUT_PATCH_SIZE = [
  'The "progress" callback was provided but "patchSize" was not defined.',
  'Without a "patchSize", the "progress" callback will never be called.',
  `For more information, see ${WARNING_PROGRESS_WITHOUT_PATCH_SIZE_URL}.`,
].join('\n');

export const GET_INVALID_SHAPED_TENSOR = (tensor: tf.Tensor): Error => new Error(
  `Invalid shape provided to getWidthAndHeight, expected tensor of rank 3 or 4: ${JSON.stringify(
    tensor.shape,
  )}`,
);

export const GET_UNDEFINED_TENSORS_ERROR = () => new Error('No defined tensors were passed to concatTensors');

export const getWidthAndHeight = (tensor: tf.Tensor3D | tf.Tensor4D): [number, number] => {
  if (isFourDimensionalTensor(tensor)) {
    return [tensor.shape[1], tensor.shape[2],];
  }
  if (isThreeDimensionalTensor(tensor)) {
    return [tensor.shape[0], tensor.shape[1],];
  }

  throw GET_INVALID_SHAPED_TENSOR(tensor);
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

export const GET_TENSOR_DIMENSION_ERROR_ROW_IS_UNDEFINED = new Error('Row is undefined');
export const GET_TENSOR_DIMENSION_ERROR_COL_IS_UNDEFINED = new Error('Column is undefined');
export const GET_TENSOR_DIMENSION_ERROR_PATCH_SIZE_IS_UNDEFINED = new Error('Patch Size is undefined');
export const GET_TENSOR_DIMENSION_ERROR_HEIGHT_IS_UNDEFINED = new Error('Height is undefined');
export const GET_TENSOR_DIMENSION_ERROR_WIDTH_IS_UNDEFINED = new Error('Width is undefined');

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
  const definedTensors: Array<tf.Tensor3D | tf.Tensor4D> = [];
  for (let i = 0; i < tensors.length; i++) {
    const tensor = tensors[i];
    if (tensor !== undefined) {
      definedTensors.push(tensor);
    }
  }
  if (definedTensors.length === 0) {
    throw GET_UNDEFINED_TENSORS_ERROR();
  }
  const concatenatedTensor = tf.concat(definedTensors, axis);
  tensors.forEach(tensor => tensor?.dispose());
  return concatenatedTensor as T;
}

/* eslint-disable @typescript-eslint/require-await */
export async function* predict(
  pixels: tf.Tensor4D,
  { output, progress, patchSize: originalPatchSize, padding, progressOutput, }: PrivateUpscaleArgs,
  {
    model,
    modelDefinition,
  }: ModelPackage
): AsyncGenerator<YieldedIntermediaryValue, tf.Tensor3D> {
  const scale = modelDefinition.scale;

  if (originalPatchSize && padding === undefined) {
    warn(WARNING_UNDEFINED_PADDING);
  }

  const patchSize = originalPatchSize;

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
        const prediction = model.predict(slicedPixels) as tf.Tensor4D;
        slicedPixels.dispose();
        yield [upscaledTensor, colTensor, prediction,];

        const startSlice = [0, sliceOrigin[0] * scale, sliceOrigin[1] * scale,];
        const endSlice = [-1, sliceSize[0] * scale, sliceSize[1] * scale,];
        const slicedPrediction = prediction.slice(
          startSlice, endSlice,
        );
        prediction.dispose();
        yield [upscaledTensor, colTensor, slicedPrediction,];
        const processedPrediction = processAndDisposeOfTensor(slicedPrediction, modelDefinition.postprocess);
        yield [upscaledTensor, colTensor, processedPrediction,];

        if (progress !== undefined && isProgress(progress)) {
          const index = row * columns + col + 1;
          const percent = index / total;
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
    const squeezedTensor = upscaledTensor!.squeeze() as tf.Tensor3D;
    /* eslint-disable @typescript-eslint/no-non-null-assertion */
    upscaledTensor!.dispose();
    return squeezedTensor;
  }

  if (progress) {
    warn(WARNING_PROGRESS_WITHOUT_PATCH_SIZE);
  }

  const pred = model.predict(pixels) as tf.Tensor4D;
  yield [pred,];
  const postprocessedTensor = processAndDisposeOfTensor(pred, modelDefinition.postprocess);

  // https://github.com/tensorflow/tfjs/issues/1125
  /* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
  const squeezedTensor = postprocessedTensor.squeeze() as tf.Tensor3D;
  postprocessedTensor.dispose();
  return squeezedTensor;
}

// if given a tensor, we copy it; otherwise, we pass input through unadulterated
// this allows us to safely dispose of memory ourselves without having to manage
// what input is in which format
export const getCopyOfInput = (input: GetImageAsTensorInput): GetImageAsTensorInput => (isTensor(input) ? input.clone() : input);

export function upscale(
  input: GetImageAsTensorInput,
  args: Omit<PrivateUpscaleArgs, 'output'> & {
    output: BASE64;
  },
  modelPackage: ModelPackage,
  ): AsyncGenerator<YieldedIntermediaryValue, string>;
export function upscale(
  input: GetImageAsTensorInput,
  args: Omit<PrivateUpscaleArgs, 'output'> & {
    output: TENSOR;
  },
  modelPackage: ModelPackage,
  ): AsyncGenerator<YieldedIntermediaryValue, tf.Tensor3D>;
export function upscale(
  input: GetImageAsTensorInput,
  args: Omit<PrivateUpscaleArgs, 'output'> & {
    output: BASE64 | TENSOR;
  },
  modelPackage: ModelPackage,
  ): AsyncGenerator<YieldedIntermediaryValue, string | tf.Tensor3D>;
export async function* upscale(
  input: GetImageAsTensorInput,
  args: Omit<PrivateUpscaleArgs, 'output'> & {
    output: BASE64 | TENSOR;
  },
  { model, modelDefinition, }: ModelPackage,
  ): AsyncGenerator<YieldedIntermediaryValue, string | tf.Tensor3D> {
  const parsedInput = getCopyOfInput(input);
  const startingPixels = await getImageAsTensor(parsedInput);
  yield startingPixels;

  const preprocessedPixels = processAndDisposeOfTensor(startingPixels, modelDefinition.preprocess);
  yield preprocessedPixels;

  const gen = predict(
    preprocessedPixels,
    args,
    {
      model,
      modelDefinition,
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
  input: GetImageAsTensorInput,
  { signal, awaitNextFrame, ...args }: Omit<PrivateUpscaleArgs, 'output'> & { output: TENSOR},
  internalArgs: ModelPackage & {
    signal: AbortSignal;
  },
  ): Promise<tf.Tensor3D>;
export function cancellableUpscale(
  input: GetImageAsTensorInput,
  { signal, awaitNextFrame, ...args }: Omit<PrivateUpscaleArgs, 'output'> & { output: BASE64},
  internalArgs: ModelPackage & {
    signal: AbortSignal;
  },
): Promise<string>;
export function cancellableUpscale(
  input: GetImageAsTensorInput,
  { signal, awaitNextFrame, ...args }: Omit<PrivateUpscaleArgs, 'output'> & { output: BASE64 | TENSOR },
  internalArgs: ModelPackage & {
    signal: AbortSignal;
  },
): Promise<tf.Tensor3D | string>;
export async function cancellableUpscale(
  input: GetImageAsTensorInput,
  { signal, awaitNextFrame, ...args }: Omit<PrivateUpscaleArgs, 'output'> & { output: BASE64 | TENSOR},
  internalArgs: ModelPackage & {
    signal: AbortSignal;
  },
) {
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
