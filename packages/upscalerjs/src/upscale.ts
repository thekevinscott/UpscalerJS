import { tf, } from './dependencies.generated';
import { UpscaleArgs, IModelDefinition, ProcessFn, ReturnType, UpscaleResponse, Progress, MultiArgProgress, } from './types';
import { getImageAsTensor, } from './image.generated';
import tensorAsBase64 from 'tensor-as-base64';
import { warn, isTensor, isProgress, isMultiArgTensorProgress, isAborted, } from './utils';
import type { GetImageAsTensorInput, } from './image.generated';

export class AbortError extends Error {
  message = 'The upscale request received an abort signal';
}

const WARNING_UNDEFINED_PADDING_URL =
  'https://thekevinscott.github.io/UpscalerJS/#/?id=padding-is-undefined';

export const WARNING_UNDEFINED_PADDING = [
  '"padding" is undefined, but "patchSize" is explicitly defined.',
  'Without padding, patches of images often have visible artifacting at the seams. Defining an explicit padding will resolve the artifacting.',
  `For more information, see ${WARNING_UNDEFINED_PADDING_URL}.`,
  'To hide this warning, pass an explicit padding of "0".',
].join('\n');

const WARNING_PROGRESS_WITHOUT_PATCH_SIZE_URL =
  'https://thekevinscott.github.io/UpscalerJS/#/?id=progress-specified-without-patch-size';

export const WARNING_PROGRESS_WITHOUT_PATCH_SIZE = [
  'The "progress" callback was provided but "patchSize" was not defined.',
  'Without a "patchSize", the "progress" callback will never be called.',
  `For more information, see ${WARNING_PROGRESS_WITHOUT_PATCH_SIZE_URL}.`,
].join('\n');

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

export function concatTensors<T extends tf.Tensor3D | tf.Tensor4D> (tensors: Array<T>, axis = 0): T {
  const concatenatedTensor = tf.concat(tensors, axis);
  tensors.forEach(tensor => tensor.dispose());
  return concatenatedTensor;
};

export async function* predict<P extends Progress<O, PO>, O extends ReturnType = 'src', PO extends ReturnType = undefined>(
  pixels: tf.Tensor4D,
  { output, progress, patchSize: originalPatchSize, padding, progressOutput }: UpscaleArgs<P, O, PO> = {},
  {
    model,
    modelDefinition,
  }: UpscaleInternalArgs
): AsyncGenerator<undefined | tf.Tensor3D> {
  const scale = modelDefinition.scale;

  if (originalPatchSize && padding === undefined) {
    warn(WARNING_UNDEFINED_PADDING);
  }

  const patchSize = originalPatchSize;

  if (patchSize) {
    const channels = 3;
    const [height, width,] = pixels.shape.slice(1);
    const { rows, columns, } = getRowsAndColumns(pixels, patchSize);
    yield;
    const { size: originalSize, } = getTensorDimensions({
      row: 0,
      col: 0,
      patchSize,
      height,
      width,
      padding,
    });
    yield;
    let upscaledTensor: tf.Tensor4D = tf.zeros([
      1,
      0,
      originalSize[1] * scale * columns,
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
        yield;
        const slicedPixels = pixels.slice(
          [0, origin[0], origin[1],],
          [-1, size[0], size[1],],
        );
        const prediction = model.predict(slicedPixels) as tf.Tensor4D;
        yield;
        slicedPixels.dispose();
        const slicedPrediction = prediction.slice(
          [0, sliceOrigin[0] * scale, sliceOrigin[1] * scale,],
          [-1, sliceSize[0] * scale, sliceSize[1] * scale,],
        );
        prediction.dispose();

        if (progress !== undefined && isProgress(progress)) {
          const index = row * columns + col + 1;
          const percent = index / total;
          if (progress.length <= 1) {
            progress(percent);
          } else {
            const squeezedTensor: tf.Tensor3D = slicedPrediction.squeeze();
            if (isMultiArgTensorProgress(progress, output, progressOutput)) {
              // if we are returning a tensor, we can not safely dispose of the tensor
              (<MultiArgProgress<'tensor'>>progress)(percent, squeezedTensor);
            } else {
              const sliceSrc = await tensorAsBase64(squeezedTensor);
              yield;
              // if we are returning a string, we can safely dispose of the tensor
              squeezedTensor.dispose();
              (<MultiArgProgress<'src'>>progress)(percent, sliceSrc);
            }
          }
          yield;
        }

        colTensor = concatTensors<tf.Tensor4D>([colTensor, slicedPrediction,], 2);
        slicedPrediction.dispose();
        yield;
      }

      upscaledTensor = concatTensors<tf.Tensor4D>([upscaledTensor, colTensor,], 1);
      colTensor.dispose();
    }
    /* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
    const squeezedTensor = upscaledTensor.squeeze() as tf.Tensor3D;
    upscaledTensor.dispose();
    return squeezedTensor;
  }

  if (progress) {
    warn(WARNING_PROGRESS_WITHOUT_PATCH_SIZE);
  }

  return tf.tidy(() => {
    const pred = model.predict(pixels) as tf.Tensor4D;
    /* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
    return pred.squeeze() as tf.Tensor3D;
  });
};

export function getProcessedPixels<T extends tf.Tensor3D | tf.Tensor4D>(
  upscaledTensor: T,
  processFn?: ProcessFn<T>,
): T {
  if (processFn) {
    return processFn(upscaledTensor);
  }
  return upscaledTensor.clone();
}

// if given a tensor, we copy it; otherwise, we pass input through unadulterated
// this allows us to safely dispose of memory ourselves without having to manage
// what input is in which format
export const getCopyOfInput = (input: GetImageAsTensorInput) => isTensor(input) ? input.clone() : input;

export async function* upscale<P extends Progress<O, PO>, O extends ReturnType = 'src', PO extends ReturnType = undefined>(
  input: GetImageAsTensorInput,
  args: UpscaleArgs<P, O, PO> = {},
  { model, modelDefinition }: UpscaleInternalArgs,
): AsyncGenerator<undefined | UpscaleResponse<O>> {
  const parsedInput = getCopyOfInput(input);
  const startingPixels = await getImageAsTensor(parsedInput);
  yield; // yield startingPixels

  const preprocessedPixels = getProcessedPixels<tf.Tensor4D>(
    startingPixels,
    modelDefinition.preprocess,
  );
  startingPixels.dispose();
  yield; // yield preprocessedPixels

  const gen = predict(
    preprocessedPixels,
    args,
    {
      model,
      modelDefinition,
    }
  );
  let { value: upscaledPixels, done } = await gen.next();
  yield; // yield upscaledPixels
  while (done === false) {
    const genResult = await gen.next();
    upscaledPixels = genResult.value;
    done = genResult.done;
    yield; // yield upscalePixels
  }
  preprocessedPixels.dispose();

  const postprocessedPixels = getProcessedPixels<tf.Tensor3D>(
    upscaledPixels,
    modelDefinition.postprocess,
  );
  upscaledPixels.dispose();
  yield; // yield postProcessedPixels

  if (args.output === 'tensor') {
    return <UpscaleResponse<O>>postprocessedPixels;
  }

  const base64Src = await tensorAsBase64(postprocessedPixels);
  postprocessedPixels.dispose();
  return <UpscaleResponse<O>>base64Src;
};

interface UpscaleInternalArgs {
  model: tf.LayersModel,
  modelDefinition: IModelDefinition,
}

export async function cancellableUpscale<P extends Progress<O, PO>, O extends ReturnType = 'src', PO extends ReturnType = undefined>(
  input: GetImageAsTensorInput,
  { signal, ...args }: UpscaleArgs<P, O, PO>,
  internalArgs: UpscaleInternalArgs,
): Promise<UpscaleResponse<O>> {
  const gen = upscale(
    input,
    args,
    internalArgs,
  );
  let { value: upscaledPixels, done } = await gen.next();
  if (isAborted(signal)) {
    throw new AbortError();
  }
  while (done === false) {
    await tf.nextFrame();
    if (isAborted(signal)) {
      throw new AbortError();
    }
    const genResult = await gen.next();
    upscaledPixels = genResult.value;
    done = genResult.done;
  }
  if (isAborted(signal)) {
    throw new AbortError();
  }
  return upscaledPixels;
}
