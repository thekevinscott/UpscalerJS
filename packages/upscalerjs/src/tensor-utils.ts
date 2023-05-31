import { tf, } from './dependencies.generated';
import { 
  Range, 
  Shape4D, 
  isValidRange, 
  isThreeDimensionalTensor,
  isFourDimensionalTensor,
  isFixedShape4D,
  FixedShape4D,
  isTensor,
} from '@upscalerjs/core';
import {
  GET_INVALID_SHAPED_TENSOR,
  GET_TENSOR_DIMENSION_ERROR_COL_IS_UNDEFINED,
  GET_TENSOR_DIMENSION_ERROR_HEIGHT_IS_UNDEFINED,
  GET_TENSOR_DIMENSION_ERROR_PATCH_SIZE_IS_UNDEFINED,
  GET_TENSOR_DIMENSION_ERROR_ROW_IS_UNDEFINED,
  GET_TENSOR_DIMENSION_ERROR_WIDTH_IS_UNDEFINED,
  GET_UNDEFINED_TENSORS_ERROR,
} from './errors-and-warnings';
import {
  nonNullable,
} from './utils';
import {
  Input,
} from './image.generated';
import {
  Coordinate,
} from './types';

export const padInput = (inputShape: Shape4D) => (pixels: tf.Tensor4D): tf.Tensor4D => {
  const pixelsHeight = pixels.shape[1];
  const pixelsWidth = pixels.shape[2];
  if (isFixedShape4D(inputShape) && (inputShape[1] > pixelsHeight || inputShape[2] > pixelsWidth)) {
    return tf.tidy(() => {
      const height = Math.max(pixelsHeight, inputShape[1]);
      const width = Math.max(pixelsWidth, inputShape[2]);
      const rightTensor = tf.zeros([1, pixelsHeight, width - pixelsWidth, 3,]) as tf.Tensor4D;
      const bottomTensor = tf.zeros([1, height - pixelsHeight, width, 3,]) as tf.Tensor4D;
      const topTensor = tf.concat([pixels, rightTensor,], 2);
      const final = tf.concat([topTensor, bottomTensor,], 1);
      return final;
    });
  }
  return pixels;
};

export const trimInput = (
  imageSize: FixedShape4D,
  scale: number,
) => (
  pixels: tf.Tensor4D
): tf.Tensor4D => {
  const height = imageSize[1] * scale;
  const width = imageSize[2] * scale;
  if (height < pixels.shape[1] || width < pixels.shape[2]) {
    return tf.tidy(() => tf.slice(pixels, [0, 0, 0,], [1, height, width, 3,]));
  }
  return pixels;
};

export const scaleOutput = (range?: Range) => (pixels: tf.Tensor4D): tf.Tensor4D => {
  const endingRange = isValidRange(range) ? range[1] : 255;
  return pixels.clipByValue(0, endingRange).mul(endingRange === 1 ? 255 : 1);
};

export const getWidthAndHeight = (tensor: tf.Tensor3D | tf.Tensor4D | tf.Tensor): Coordinate => {
  if (isFourDimensionalTensor(tensor)) {
    return [tensor.shape[1], tensor.shape[2],];
  }
  if (isThreeDimensionalTensor(tensor)) {
    return [tensor.shape[0], tensor.shape[1],];
  }

  throw GET_INVALID_SHAPED_TENSOR(tensor.shape);
};

export const scaleIncomingPixels = (range?: Range) => (tensor: tf.Tensor4D): tf.Tensor4D => {
  if (isValidRange(range) && range[1] === 1) {
    return tf.mul(tensor, 1 / 255);
  }
  return tensor;
};

export const tensorAsClampedArray = (tensor: tf.Tensor3D): Uint8Array | Float32Array | Int32Array => tf.tidy(() => {
  const [height, width,] = tensor.shape;
  const fill = tf.fill([height, width,], 255).expandDims(2);
  return tensor.clipByValue(0, 255).concat([fill,], 2).dataSync();
});

export const checkAndAdjustSliceSize = (
  dimension: number,
  size: Coordinate,
  _sliceEndPosition: Coordinate,
): Coordinate => {
  const sliceEndPosition: Coordinate = [..._sliceEndPosition,];
  if (sliceEndPosition[dimension] > size[dimension]) {
    sliceEndPosition[dimension] = size[dimension];
  }
  return sliceEndPosition;
};

// mutating function
export const checkAndAdjustEndingPosition = (
  size: number,
  dimension: number,
  _endPosition: Coordinate,
  _origin: Coordinate,
  _sliceOrigin: Coordinate,
  _sliceEndPosition: Coordinate,
): [
  Coordinate,
  Coordinate,
  Coordinate,
  Coordinate,
] => {
  const endPosition: Coordinate = [..._endPosition,];
  const origin: Coordinate = [..._origin,];
  const sliceOrigin: Coordinate = [..._sliceOrigin,];
  const sliceEndPosition: Coordinate = [..._sliceEndPosition,];
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

  return [
    endPosition,
    origin,
    sliceOrigin,
    sliceEndPosition,
  ];
};

// check that padding has not pushed our origins off the board
// this is a mutating function
export const checkAndAdjustStartingPosition = (
  dimension: number,
  origin: Coordinate,
  sliceOrigin: Coordinate,
): [
  Coordinate,
  Coordinate,
] => {
  const newOrigin: Coordinate = [...origin, ];
  const newSliceOrigin: Coordinate = [...sliceOrigin, ];

  // check that our origin is not off the board.
  if (origin[dimension] < 0) {
    // first, find out how much it overhangs
    const amount = 0 - origin[dimension];

    // then, increase origin by that amount (could also just set it to 0.)
    newOrigin[dimension] += amount;

    // and increase sliceOrigin to accommodate
    newSliceOrigin[dimension] -= amount;
  }

  return [
    newOrigin,
    newSliceOrigin,
  ];
};

// if given a tensor, we copy it; otherwise, we pass input through unadulterated
// this allows us to safely dispose of memory ourselves without having to manage
// what input is in which format
export const getCopyOfInput = (input: Input): Input => (isTensor(input) ? input.clone() : input);

export interface GetTensorDimensionsOpts {
  row: number;
  col: number;
  patchSize: number;
  height: number;
  width: number;
  padding?: number;
}
export type GetTensorDimensions = (opts: GetTensorDimensionsOpts) => {
  preprocessedCoordinates: {
    origin: Coordinate;
    size: Coordinate;
  };
  postprocessedCoordinates: {
    origin: Coordinate;
    size: Coordinate;
  };
};

export const getTensorDimensions: GetTensorDimensions = ({
  row,
  col,
  patchSize,
  height,
  width,
  padding = 0,
})  => {
  // non typescript code can call this function, so we add runtime
  // checks to ensure required values are present
  const errChecks: [number | undefined, Error][] = [
    [row, GET_TENSOR_DIMENSION_ERROR_ROW_IS_UNDEFINED,],
    [col, GET_TENSOR_DIMENSION_ERROR_COL_IS_UNDEFINED,],
    [patchSize, GET_TENSOR_DIMENSION_ERROR_PATCH_SIZE_IS_UNDEFINED,],
    [height, GET_TENSOR_DIMENSION_ERROR_HEIGHT_IS_UNDEFINED,],
    [width, GET_TENSOR_DIMENSION_ERROR_WIDTH_IS_UNDEFINED,],
  ];
  for (const [arg, err, ] of errChecks) { if (arg === undefined) { throw err; } }

  const yPatchSize = patchSize > height ? height : patchSize;
  const xPatchSize = patchSize > width ? width : patchSize;

  const [initialOrigin, initialSliceOrigin, ] = [0, 1, ].reduce<[Coordinate, Coordinate, ]>(([
    origin,
    sliceOrigin,
  ], dim) => checkAndAdjustStartingPosition(
    dim,
    origin,
    sliceOrigin,
  ), [
    // initial origin
    [
      row * patchSize - padding,
      col * patchSize - padding,
    ],
    // initial slice origin
    [padding, padding,],
  ]);


  const [
    endPosition,
    preprocessedPixelsOrigin,
    postprocessedPixelsOrigin,
    initialPostProcessedEndPosition,
  ] = [[height, 0,], [width, 1,], ].reduce<[Coordinate, Coordinate, Coordinate, Coordinate, ]>(([
    ...args
  ], [size, dim,]) => checkAndAdjustEndingPosition(
    size,
    dim,
    ...args,
  ), [
    // initial end position
    [
      initialOrigin[0] + yPatchSize + padding * 2,
      initialOrigin[1] + xPatchSize + padding * 2,
    ],
    // initial origin
    initialOrigin,
    // initial sliceOrigin
    initialSliceOrigin,
    // initial sliceEndPosition
    [
      initialSliceOrigin[0] + yPatchSize,
      initialSliceOrigin[1] + xPatchSize,
    ],
  ]);

  const preprocessedPixelsSize: Coordinate = [
    endPosition[0] - preprocessedPixelsOrigin[0],
    endPosition[1] - preprocessedPixelsOrigin[1],
  ];

  const postProcessedEndPosition = [0, 1, ].reduce<Coordinate>((postProcessedEndPosition, dim) => checkAndAdjustSliceSize(
    dim,
    preprocessedPixelsSize,
    postProcessedEndPosition,
  ), initialPostProcessedEndPosition);

  return {
    preprocessedCoordinates: {
      origin: preprocessedPixelsOrigin,
      size: preprocessedPixelsSize,
    },
    postprocessedCoordinates: {
      origin: postprocessedPixelsOrigin,
      size: [
        postProcessedEndPosition[0] - postprocessedPixelsOrigin[0],
        postProcessedEndPosition[1] - postprocessedPixelsOrigin[1],
      ],
    },
  };
};

export function concatTensors<T extends tf.Tensor3D | tf.Tensor4D> (tensors: Array<T | undefined>, axis = 0): T {
  const definedTensors: Array<tf.Tensor3D | tf.Tensor4D> = tensors.filter(nonNullable);
  if (definedTensors.length === 0) {
    throw GET_UNDEFINED_TENSORS_ERROR;
  }
  const concatenatedTensor = tf.concat(definedTensors, axis);
  tensors.forEach(tensor => tensor?.dispose());
  return concatenatedTensor as T;
}
