import * as tf from '@tensorflow/tfjs-node';
import {
  AbortError,
  predict,
  getRowsAndColumns,
  getTensorDimensions,
  getCopyOfInput,
  getProcessedPixels,
  concatTensors,
  upscale,
  cancellableUpscale,
  WARNING_PROGRESS_WITHOUT_PATCH_SIZE,
  WARNING_UNDEFINED_PADDING,
  getWidthAndHeight,
  GET_INVALID_SHAPED_TENSOR,
  GetTensorDimensionsOpts,
  GET_TENSOR_DIMENSION_ERROR_ROW_IS_UNDEFINED,
  GET_TENSOR_DIMENSION_ERROR_COL_IS_UNDEFINED,
  GET_TENSOR_DIMENSION_ERROR_PATCH_SIZE_IS_UNDEFINED,
  GET_TENSOR_DIMENSION_ERROR_HEIGHT_IS_UNDEFINED,
  GET_TENSOR_DIMENSION_ERROR_WIDTH_IS_UNDEFINED,
  makeTick,
  GET_UNDEFINED_TENSORS_ERROR,
} from './upscale';
import { tensorAsBase64 as _tensorAsBase64, getImageAsTensor as _getImageAsTensor, } from './image.generated';
import { wrapGenerator, isTensor as _isTensor, } from './utils';
import { ModelDefinition } from "@upscalerjs/core";
import { ModelPackage, Progress, } from './types';
import { mockFn } from '../../../test/lib/shared/mockers';

jest.mock('./image.generated', () => {
  const { tensorAsBase64, getImageAsTensor, ...rest } = jest.requireActual('./image.generated');
  return {
    ...rest,
    tensorAsBase64: jest.fn(tensorAsBase64),
    getImageAsTensor: jest.fn(getImageAsTensor),
  };
});
jest.mock('./utils', () => {
  const { isTensor, ...rest} = jest.requireActual('./utils');
  return {
    ...rest,
    isTensor: jest.fn(isTensor),
  };
});

const tensorAsBase64 = mockFn(_tensorAsBase64);
const getImageAsTensor = mockFn(_getImageAsTensor);
const isTensor = mockFn(_isTensor);

describe('concatTensors', () => {
  beforeEach(() => {
    tensorAsBase64.mockClear();
    getImageAsTensor.mockClear();
    isTensor.mockClear();
  });
  it('concats two tensors together', () => {
    const a: tf.Tensor3D = tf.tensor(
      [1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4],
      [2, 2, 3,],
    );
    const b: tf.Tensor3D = tf.tensor(
      [10, 10, 10, 20, 20, 20, 30, 30, 30, 40, 40, 40],
      [2, 2, 3,],
    );
    const axis = 1;
    const expected = tf.concat([a, b], axis);
    const result = concatTensors([a, b], axis);
    expect(result.shape).toEqual([2, 4, 3])
    expect(result.dataSync()).toEqual(expected.dataSync());
    expect(a.isDisposed).toBe(true);
    expect(b.isDisposed).toBe(true);
  });

  it('throws if given no tensors', () => {
    expect(() => concatTensors([undefined, undefined])).toThrowError(GET_UNDEFINED_TENSORS_ERROR());
  });
});

describe('getProcessedPixels', () => {
  it('clones tensor if not given a process function', () => {
    const mockClone = jest.fn();
    const mockTensor = jest.fn().mockImplementation(() => {
      return { clone: mockClone } as any as tf.Tensor3D;
    });
    getProcessedPixels(mockTensor());
    expect(mockClone).toBeCalledTimes(1);
  });

  it('calls process function if given one', () => {
    const mockClone = jest.fn();
    const mockTensor = jest.fn().mockImplementation(() => {
      return { clone: mockClone } as any as tf.Tensor3D;
    });
    const processFn = jest.fn();
    getProcessedPixels(mockTensor(), processFn);
    expect(mockClone).toBeCalledTimes(0);
    expect(processFn).toBeCalledTimes(1);
  });
});

describe('getCopyOfInput', () => {
  it('returns non-tensor input unadulterated', () => {
    const input = { foo: 'foo' } as any;
    expect(getCopyOfInput(input)).toEqual(input);
  });

  it('returns a copy of a given 4d tensor', () => {
    const input: tf.Tensor4D = tf.tensor(
      [1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4,],
      [1, 2, 2, 3,],
    );
    expect(getCopyOfInput(input)).not.toEqual(input);
  });

  it('returns a copy of a given 3d tensor', () => {
    const input: tf.Tensor3D = tf.tensor(
      [1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4,],
      [2, 2, 3,],
    );
    expect(getCopyOfInput(input)).not.toEqual(input);
  });
});

describe('getTensorDimensions', () => {
  interface IOpts {
    width: number;
    height: number;
    patchSize: number;
    padding: number;
  }
  interface IExpectation {
    row: number;
    col: number;
    expectation: {
      origin: [number, number];
      size: [number, number];
      sliceOrigin?: [number, number];
      sliceSize: [number, number];
    };
  }

  const testGetTensorDimensions = (
    opts: IOpts,
    expectations: Array<IExpectation>,
  ) => {
    for (let i = 0; i < expectations.length; i++) {
      const {
        row,
        col,
        expectation: { origin, size, sliceOrigin = [0, 0,], sliceSize, },
      } = expectations[i];
      try {
        expect(
          getTensorDimensions({
            row,
            col,
            patchSize: opts.patchSize,
            padding: opts.padding,
            height: opts.height,
            width: opts.width,
          }),
        ).toEqual({
          origin,
          size,
          sliceOrigin,
          sliceSize,
        });
      } catch (err) {
        throw new Error(`*******\n${row} | ${col}\n*******\n${err}`);
      }
    }
  };

  it('gets tensor dimensions for a fully-covered patch size', () => {
    testGetTensorDimensions(
      {
        width: 2,
        height: 2,
        patchSize: 2,
        padding: 0,
      },
      [
        {
          row: 0,
          col: 0,
          expectation: {
            origin: [0, 0,],
            size: [2, 2,],
            sliceSize: [2, 2,],
          },
        },
      ],
    );
  });

  it('gets tensor dimensions for a larger patch size', () => {
    testGetTensorDimensions(
      {
        width: 2,
        height: 2,
        patchSize: 4,
        padding: 0,
      },
      [
        {
          row: 0,
          col: 0,
          expectation: {
            origin: [0, 0,],
            size: [2, 2,],
            sliceOrigin: [0, 0,],
            sliceSize: [2, 2,],
          },
        },
      ],
    );
  });

  it('gets tensor dimensions for a subset patch size that fits equally', () => {
    const sliceSize: [number, number] = [2, 2,];
    const size: [number, number] = [2, 2,];
    testGetTensorDimensions(
      {
        width: 4,
        height: 4,
        patchSize: 2,
        padding: 0,
      },
      [
        {
          row: 0,
          col: 0,
          expectation: {
            origin: [0, 0,],
            size,
            sliceSize,
          },
        },
        {
          row: 1,
          col: 0,
          expectation: {
            origin: [2, 0,],
            size,
            sliceSize,
          },
        },
        {
          row: 0,
          col: 1,
          expectation: {
            origin: [0, 2,],
            size,
            sliceSize,
          },
        },
        {
          row: 1,
          col: 1,
          expectation: {
            origin: [2, 2,],
            size,
            sliceSize,
          },
        },
      ],
    );
  });

  it('gets tensor dimensions for a subset patch size that is unequal without padding', () => {
    const size: [number, number] = [4, 4,];
    testGetTensorDimensions(
      {
        width: 6,
        height: 6,
        patchSize: 4,
        padding: 0,
      },
      [
        {
          row: 0,
          col: 0,
          expectation: {
            origin: [0, 0,],
            size,
            sliceOrigin: [0, 0,],
            sliceSize: [4, 4,],
          },
        },
        {
          row: 1,
          col: 0,
          expectation: {
            origin: [2, 0,],
            size,
            sliceOrigin: [2, 0,],
            sliceSize: [2, 4,],
          },
        },
        {
          row: 0,
          col: 1,
          expectation: {
            origin: [0, 2,],
            size,
            sliceOrigin: [0, 2,],
            sliceSize: [4, 2,],
          },
        },
        {
          row: 1,
          col: 1,
          expectation: {
            origin: [2, 2,],
            size,
            sliceOrigin: [2, 2,],
            sliceSize: [2, 2,],
          },
        },
      ],
    );
  });

  it('gets tensor dimensions for an uneven subset patch size that fits equally', () => {
    const size: [number, number] = [2, 2,];
    const sliceSize: [number, number] = [2, 2,];
    testGetTensorDimensions(
      {
        width: 6,
        height: 4,
        patchSize: 2,
        padding: 0,
      },
      [
        {
          row: 0,
          col: 0,
          expectation: {
            origin: [0, 0,],
            size,
            sliceOrigin: [0, 0,],
            sliceSize,
          },
        },
        {
          row: 1,
          col: 0,
          expectation: {
            origin: [2, 0,],
            size,
            sliceSize,
          },
        },
        {
          row: 0,
          col: 1,
          expectation: {
            origin: [0, 2,],
            size,
            sliceSize,
          },
        },
        {
          row: 1,
          col: 1,
          expectation: {
            origin: [2, 2,],
            size,
            sliceSize,
          },
        },
        {
          row: 0,
          col: 2,
          expectation: {
            origin: [0, 4,],
            size,
            sliceSize,
          },
        },
        {
          row: 1,
          col: 2,
          expectation: {
            origin: [2, 4,],
            size,
            sliceSize,
          },
        },
      ],
    );
  });

  it('gets tensor dimensions for an uneven subset patch size that fits unequally without padding', () => {
    const size: [number, number] = [4, 4,];
    testGetTensorDimensions(
      {
        width: 10,
        height: 5,
        patchSize: 4,
        padding: 0,
      },
      [
        {
          row: 0,
          col: 0,
          expectation: {
            origin: [0, 0,],
            sliceOrigin: [0, 0,],
            size,
            sliceSize: [4, 4,],
          },
        },
        {
          row: 1,
          col: 0,
          expectation: {
            origin: [1, 0,],
            sliceOrigin: [3, 0,],
            size,
            sliceSize: [1, 4,],
          },
        },
        {
          row: 0,
          col: 1,
          expectation: {
            origin: [0, 4,],
            sliceOrigin: [0, 0,],
            size,
            sliceSize: [4, 4,],
          },
        },
        {
          row: 1,
          col: 1,
          expectation: {
            origin: [1, 4,],
            sliceOrigin: [3, 0,],
            size,
            sliceSize: [1, 4,],
          },
        },
        {
          row: 0,
          col: 2,
          expectation: {
            origin: [0, 6,],
            sliceOrigin: [0, 2,],
            size,
            sliceSize: [4, 2,],
          },
        },
        {
          row: 1,
          col: 2,
          expectation: {
            origin: [1, 6,],
            sliceOrigin: [3, 2,],
            size,
            sliceSize: [1, 2,],
          },
        },
      ],
    );
  });

  describe('Padding for constant sized slices', () => {
    it('gets tensor dimensions for a subset patch size that fits equally with padding', () => {
      const size: [number, number] = [4, 4,];
      const sliceSize: [number, number] = [2, 2,];
      testGetTensorDimensions(
        {
          width: 4,
          height: 4,
          patchSize: 2,
          padding: 1,
        },
        [
          {
            row: 0,
            col: 0,
            expectation: {
              origin: [0, 0,],
              sliceOrigin: [0, 0,],
              size,
              sliceSize,
            },
          },
          {
            row: 1,
            col: 0,
            expectation: {
              origin: [0, 0,],
              sliceOrigin: [2, 0,],
              size,
              sliceSize,
            },
          },
          {
            row: 0,
            col: 1,
            expectation: {
              origin: [0, 0,],
              sliceOrigin: [0, 2,],
              size,
              sliceSize,
            },
          },
          {
            row: 1,
            col: 1,
            expectation: {
              origin: [0, 0,],
              sliceOrigin: [2, 2,],
              size,
              sliceSize,
            },
          },
        ],
      );
    });

    it('gets tensor dimensions for a subset patch size that fits equally with padding with more dimensions', () => {
      const size: [number, number] = [5, 5,];
      const sliceSize: [number, number] = [3, 3,];
      testGetTensorDimensions(
        {
          width: 9,
          height: 9,
          patchSize: 3,
          padding: 1,
        },
        [
          {
            row: 0,
            col: 0,
            expectation: {
              origin: [0, 0,],
              sliceOrigin: [0, 0,],
              size,
              sliceSize,
            },
          },
          {
            row: 1,
            col: 0,
            expectation: {
              origin: [2, 0,],
              sliceOrigin: [1, 0,],
              size,
              sliceSize,
            },
          },
          {
            row: 2,
            col: 0,
            expectation: {
              origin: [4, 0,],
              sliceOrigin: [2, 0,],
              size,
              sliceSize,
            },
          },
          {
            row: 0,
            col: 1,
            expectation: {
              origin: [0, 2,],
              sliceOrigin: [0, 1,],
              size,
              sliceSize,
            },
          },
          {
            row: 1,
            col: 1,
            expectation: {
              origin: [2, 2,],
              sliceOrigin: [1, 1,],
              size,
              sliceSize,
            },
          },
          {
            row: 2,
            col: 1,
            expectation: {
              origin: [4, 2,],
              sliceOrigin: [2, 1,],
              size,
              sliceSize,
            },
          },
          {
            row: 0,
            col: 2,
            expectation: {
              origin: [0, 4,],
              sliceOrigin: [0, 2,],
              size,
              sliceSize,
            },
          },
          {
            row: 1,
            col: 2,
            expectation: {
              origin: [2, 4,],
              sliceOrigin: [1, 2,],
              size,
              sliceSize,
            },
          },
          {
            row: 2,
            col: 2,
            expectation: {
              origin: [4, 4,],
              sliceOrigin: [2, 2,],
              size,
              sliceSize,
            },
          },
        ],
      );
    });

    it('gets tensor dimensions for a fully-covered patch size with padding for constant patch', () => {
      testGetTensorDimensions(
        {
          width: 2,
          height: 2,
          patchSize: 2,
          padding: 1,
        },
        [
          {
            row: 0,
            col: 0,
            expectation: {
              origin: [0, 0,],
              size: [2, 2,],
              sliceOrigin: [0, 0,],
              sliceSize: [2, 2,],
            },
          },
        ],
      );
    });

    it('gets tensor dimensions for a subset patch size that is unequal with padding for constant patch size', () => {
      const size: [number, number] = [6, 6,];
      testGetTensorDimensions(
        {
          width: 9,
          height: 9,
          patchSize: 4,
          padding: 1,
        },
        [
          {
            row: 0,
            col: 0,
            expectation: {
              origin: [0, 0,],
              sliceOrigin: [0, 0,],
              size,
              sliceSize: [4, 4,],
            },
          },
          {
            row: 1,
            col: 0,
            expectation: {
              origin: [3, 0,],
              sliceOrigin: [1, 0,],
              size,
              sliceSize: [4, 4,],
            },
          },
          {
            row: 2,
            col: 0,
            expectation: {
              origin: [3, 0,],
              sliceOrigin: [5, 0,],
              size,
              sliceSize: [1, 4,],
            },
          },
          {
            row: 0,
            col: 1,
            expectation: {
              origin: [0, 3,],
              sliceOrigin: [0, 1,],
              size,
              sliceSize: [4, 4,],
            },
          },
          {
            row: 1,
            col: 1,
            expectation: {
              origin: [3, 3,],
              sliceOrigin: [1, 1,],
              size,
              sliceSize: [4, 4,],
            },
          },
          {
            row: 2,
            col: 1,
            expectation: {
              origin: [3, 3,],
              sliceOrigin: [5, 1,],
              size,
              sliceSize: [1, 4,],
            },
          },
          {
            row: 0,
            col: 2,
            expectation: {
              origin: [0, 3,],
              sliceOrigin: [0, 5,],
              size,
              sliceSize: [4, 1,],
            },
          },
          {
            row: 1,
            col: 2,
            expectation: {
              origin: [3, 3,],
              sliceOrigin: [1, 5,],
              size,
              sliceSize: [4, 1,],
            },
          },
          {
            row: 2,
            col: 2,
            expectation: {
              origin: [3, 3,],
              sliceOrigin: [5, 5,],
              size,
              sliceSize: [1, 1,],
            },
          },
        ],
      );
    });

    it('gets tensor dimensions for an uneven subset patch size that fits equally with padding for a constant patch size', () => {
      const size: [number, number] = [5, 5,];
      const sliceSize: [number, number] = [3, 3,];
      testGetTensorDimensions(
        {
          width: 9,
          height: 6,
          patchSize: 3,
          padding: 1,
        },
        [
          {
            row: 0,
            col: 0,
            expectation: {
              origin: [0, 0,],
              sliceOrigin: [0, 0,],
              size,
              sliceSize,
            },
          },
          {
            row: 1,
            col: 0,
            expectation: {
              origin: [1, 0,],
              sliceOrigin: [2, 0,],
              size,
              sliceSize,
            },
          },
          {
            row: 0,
            col: 1,
            expectation: {
              origin: [0, 2,],
              sliceOrigin: [0, 1,],
              size,
              sliceSize,
            },
          },
          {
            row: 1,
            col: 1,
            expectation: {
              origin: [1, 2,],
              sliceOrigin: [2, 1,],
              size,
              sliceSize,
            },
          },
          {
            row: 0,
            col: 2,
            expectation: {
              origin: [0, 4,],
              sliceOrigin: [0, 2,],
              size,
              sliceSize,
            },
          },
          {
            row: 1,
            col: 2,
            expectation: {
              origin: [1, 4,],
              sliceOrigin: [2, 2,],
              size,
              sliceSize,
            },
          },
        ],
      );
    });

    it('gets tensor dimensions for an uneven subset patch size that fits unequally with padding for constant patch size', () => {
      const size: [number, number] = [6, 6,];
      testGetTensorDimensions(
        {
          width: 9,
          height: 6,
          patchSize: 4,
          padding: 1,
        },
        [
          {
            row: 0,
            col: 0,
            expectation: {
              origin: [0, 0,],
              sliceOrigin: [0, 0,],
              size,
              sliceSize: [4, 4,],
            },
          },
          {
            row: 1,
            col: 0,
            expectation: {
              origin: [0, 0,],
              sliceOrigin: [4, 0,],
              size,
              sliceSize: [2, 4,],
            },
          },
          {
            row: 0,
            col: 1,
            expectation: {
              origin: [0, 3,],
              sliceOrigin: [0, 1,],
              size,
              sliceSize: [4, 4,],
            },
          },
          {
            row: 1,
            col: 1,
            expectation: {
              origin: [0, 3,],
              sliceOrigin: [4, 1,],
              size,
              sliceSize: [2, 4,],
            },
          },
          {
            row: 0,
            col: 2,
            expectation: {
              origin: [0, 3,],
              sliceOrigin: [0, 5,],
              size,
              sliceSize: [4, 1,],
            },
          },
          {
            row: 1,
            col: 2,
            expectation: {
              origin: [0, 3,],
              sliceOrigin: [4, 5,],
              size,
              sliceSize: [2, 1,],
            },
          },
        ],
      );
    });

    it('gets tensor dimensions for a very small patch size for constant patch size', () => {
      // const size: [number, number] = [9, 9];
      const sliceSize: [number, number] = [1, 1,];
      testGetTensorDimensions(
        {
          width: 13,
          height: 2,
          patchSize: 1,
          padding: 4,
        },
        [
          {
            row: 0,
            col: 0,
            expectation: {
              origin: [0, 0,],
              size: [2, 9,],
              sliceOrigin: [0, 0,],
              sliceSize,
            },
          },
          {
            row: 1,
            col: 0,
            expectation: {
              origin: [0, 0,],
              size: [2, 9,],
              sliceOrigin: [1, 0,],
              sliceSize,
            },
          },
          {
            row: 0,
            col: 8,
            expectation: {
              origin: [0, 4,],
              size: [2, 9,],
              sliceOrigin: [0, 4,],
              sliceSize,
            },
          },
          {
            row: 1,
            col: 8,
            expectation: {
              origin: [0, 4,],
              size: [2, 9,],
              sliceOrigin: [1, 4,],
              sliceSize,
            },
          },
        ],
      );
    });

    it('gets tensor dimensions for a larger image at constant patch size', () => {
      const size: [number, number] = [40, 40,];
      const sliceSize: [number, number] = [32, 32,];
      testGetTensorDimensions(
        {
          width: 100,
          height: 100,
          patchSize: 32,
          padding: 4,
        },
        [
          {
            row: 0,
            col: 0,
            expectation: {
              origin: [0, 0,],
              sliceOrigin: [0, 0,],
              size,
              sliceSize,
            },
          },
          {
            row: 1,
            col: 0,
            expectation: {
              origin: [28, 0,],
              sliceOrigin: [4, 0,],
              size,
              sliceSize,
            },
          },
          {
            row: 2,
            col: 0,
            expectation: {
              origin: [60, 0,],
              sliceOrigin: [4, 0,],
              size,
              sliceSize,
            },
          },
          {
            row: 3,
            col: 0,
            expectation: {
              origin: [60, 0,],
              sliceOrigin: [36, 0,],
              size,
              sliceSize: [4, 32,],
            },
          },
        ],
      );
    });
  });

  it('gets tensor dimensions for the patch size example app', () => {
    testGetTensorDimensions(
      {
        width: 100,
        height: 100,
        patchSize: 20,
        padding: 5,
      },
      [
        {
          row: 0,
          col: 0,
          expectation: {
            origin: [0, 0,],
            size: [30, 30,],
            sliceSize: [20, 20,],
          },
        },
      ],
    );
  });

  it('throws an error if row is not defined', () => {
    expect(() => getTensorDimensions({
      row: undefined,
    } as unknown as GetTensorDimensionsOpts)).toThrow(GET_TENSOR_DIMENSION_ERROR_ROW_IS_UNDEFINED);
  });

  it('throws an error if col is not defined', () => {
    expect(() => getTensorDimensions({
      row: 0,
      col: undefined,
    } as unknown as GetTensorDimensionsOpts)).toThrow(GET_TENSOR_DIMENSION_ERROR_COL_IS_UNDEFINED);
  });

  it('throws an error if patch size is not defined', () => {
    expect(() => getTensorDimensions({
      row: 0,
      col: 0,
      patchSize: undefined,
    } as unknown as GetTensorDimensionsOpts)).toThrow(GET_TENSOR_DIMENSION_ERROR_PATCH_SIZE_IS_UNDEFINED);
  });

  it('throws an error if height is not defined', () => {
    expect(() => getTensorDimensions({
      row: 0,
      col: 0,
      patchSize: 0,
      height: undefined
    } as unknown as GetTensorDimensionsOpts)).toThrow(GET_TENSOR_DIMENSION_ERROR_HEIGHT_IS_UNDEFINED);
  });

  it('throws an error if width is not defined', () => {
    expect(() => getTensorDimensions({
      row: 0,
      col: 0,
      patchSize: 0,
      height: 0,
      width: undefined
    } as unknown as GetTensorDimensionsOpts)).toThrow(GET_TENSOR_DIMENSION_ERROR_WIDTH_IS_UNDEFINED);
  });
});

describe('getRowsAndColumns', () => {
  it('gets rows and columns', () => {
    const img: tf.Tensor4D = tf.tensor(
      [1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4,],
      [1, 2, 2, 3,],
    );

    expect(getRowsAndColumns(img, 1)).toEqual({
      rows: 2,
      columns: 2,
    });
  });

  it('gets single row and column for a greater-than patch size', () => {
    const img: tf.Tensor4D = tf.tensor(
      [1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4,],
      [1, 2, 2, 3,],
    );

    expect(getRowsAndColumns(img, 3)).toEqual({
      rows: 1,
      columns: 1,
    });
  });

  it('gets uneven rows and columns by rounding up', () => {
    const img: tf.Tensor4D = tf.tensor(
      [
        1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 6, 7, 7, 7, 8, 8, 8,
        9, 9, 9,
      ],
      [1, 3, 3, 3,],
    );

    expect(getRowsAndColumns(img, 2)).toEqual({
      rows: 2,
      columns: 2,
    });
  });
});

describe('predict', () => {
  const origWarn = console.warn;
  const modelDefinition = { scale: 2, } as ModelDefinition;

  const SCALE = 2;
  const model = tf.sequential();
  model.add(tf.layers.upSampling2d({
    size: [SCALE, SCALE],
    dataFormat: 'channelsLast',
    inputShape: [null, null, 3],
  }));
  model.compile({ loss: "meanSquaredError", optimizer: "sgd" });
  const modelPackage: ModelPackage = {
    model,
    modelDefinition,
  };

  let tensor: undefined | tf.Tensor3D | tf.Tensor4D;

  afterEach(() => {
    console.warn = origWarn;

    if (tensor !== undefined) {
      tensor.dispose();
    }
  });

  const getWidthAndHeight = (img: tf.Tensor3D | tf.Tensor4D) => {
    if (img.shape.length === 4) {
      return [img.shape[1], img.shape[2]];
    }
    return [img.shape[0], img.shape[1]];
  };

  const checkStartingTensorAgainstUpscaledTensor = (img?: tf.Tensor3D | tf.Tensor4D, result?: tf.Tensor3D | tf.Tensor4D, scale = SCALE) => tf.tidy(() => {
    if (!img) {
      throw new Error('No starting tensor provided.')
    }
    const [height, width] = getWidthAndHeight(img);
    const resizedOriginal = tf.image.resizeNearestNeighbor(img, [height * scale, width * scale]).expandDims(0);
    expect(resizedOriginal.dataSync()).toEqual(result?.dataSync());
  });

  const getTensorRange = (width: number, height: number): tf.Tensor1D => tf.tidy(() => tf.range(1, 1 + (width * height), 1));

  const getTensor = (height: number, width: number): tf.Tensor3D => tf.tidy(() => getTensorRange(width, height).reshape([height, width, 1]).tile([1, 1, 3]));

  it('should make a prediction', async () => {
    const spy = jest.spyOn(model, 'predict');
    tensor = getTensor(2, 2);
    const result = await wrapGenerator(predict(tensor.expandDims(0), { }, modelPackage));
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        shape: [1, 2, 2, 3,],
      }),
    );
    checkStartingTensorAgainstUpscaledTensor(tensor, result);
  });

  it('should make a prediction with a patchSize', async () => {
    tensor = getTensor(2, 2);
    const result = await wrapGenerator(predict(
      tensor.expandDims(0),
      {
        patchSize: 1,
        padding: 0,
      },
      modelPackage,
    ));
    checkStartingTensorAgainstUpscaledTensor(tensor, result);
  });

  it('should make a prediction with a patchSize and a tall image', async () => {
    const tensor = getTensor(4, 2);
    const result = await wrapGenerator(predict(
      tensor.expandDims(0),
      {
        patchSize: 1,
        padding: 0,
      },
      modelPackage,
    ));
    checkStartingTensorAgainstUpscaledTensor(tensor, result);
  });

  it('should callback with progress on patchSize', async () => {
    console.warn = jest.fn();
    tensor = getTensor(4, 4).expandDims(0) as tf.Tensor4D;
    const patchSize = 2;
    const progress = jest.fn();
    await wrapGenerator(
      predict(tensor, {
        patchSize,
        padding: 0,
        progress,
      }, modelPackage)
    );
    expect(progress).toHaveBeenCalledWith(0.25);
    expect(progress).toHaveBeenCalledWith(0.5);
    expect(progress).toHaveBeenCalledWith(0.75);
    expect(progress).toHaveBeenCalledWith(1);
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('should invoke progress callback with percent and slice', async () => {
    console.warn = jest.fn();
    const mockResponse = 'foobarbaz1';
    tensorAsBase64.mockImplementation(() => mockResponse);
    const tensor = getTensor(4, 4).expandDims(0) as tf.Tensor4D;
    const patchSize = 2;
    const progress = jest.fn((_1: any, _2: any) => {});
    await wrapGenerator(
      predict(tensor, {
        patchSize,
        padding: 0,
        progress,
      }, modelPackage)
    );
    expect(progress).toHaveBeenCalledWith(0.5, mockResponse);
    expect(progress).toHaveBeenCalledWith(1, mockResponse);
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('should invoke progress callback with slice as tensor, if output is a tensor, for a tall image', async () => {
    console.warn = jest.fn();
    // (mockedTensorAsBase as any).default = async() => 'foobarbaz2';
    tensor = getTensor(4, 2).expandDims(0) as tf.Tensor4D;
    const patchSize = 2;
    const getSlice = (t: tf.Tensor, x: number, y: number) => tf.tidy(() => t.slice([0, x, y], [1, patchSize, patchSize]) as tf.Tensor3D);
    const progress = jest.fn((rate: number, progressTensor: tf.Tensor3D) => {
      if (rate === .5) {
        tf.tidy(() => checkStartingTensorAgainstUpscaledTensor(getSlice(tensor!, 0, 0), progressTensor));
      } else if (rate === 1) {
        tf.tidy(() => checkStartingTensorAgainstUpscaledTensor(getSlice(tensor!, 2, 0), progressTensor));
      } else {
        throw new Error(`Unexpected rate: ${rate}`);
      }
    }) as unknown as Progress<'tensor', undefined>
    await wrapGenerator(
      predict(tensor, {
        patchSize,
        padding: 0,
        progress,
        output: 'tensor',
      }, modelPackage)
    );
    expect(progress).toHaveBeenCalledWith(0.5,
      expect.objectContaining({
        shape: [4, 4, 3,],
      }),
    );
    expect(progress).toHaveBeenCalledWith(1,
      expect.objectContaining({
        shape: [4, 4, 3,],
      }),
    );
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('should invoke progress callback with slice as tensor, if output is a tensor, for a wide image', async () => {
    console.warn = jest.fn();
    tensor = getTensor(2, 4).expandDims(0) as tf.Tensor4D;
    const patchSize = 2;
    const getSlice = (t: tf.Tensor, x: number, y: number) => tf.tidy(() => t.slice([0, x, y], [1, patchSize, patchSize]) as tf.Tensor3D);
    const progress = jest.fn((rate: number, progressTensor: tf.Tensor3D) => {
      if (rate === .5) {
        tf.tidy(() => checkStartingTensorAgainstUpscaledTensor(getSlice(tensor!, 0, 0), progressTensor));
      } else if (rate === 1) {
        tf.tidy(() => checkStartingTensorAgainstUpscaledTensor(getSlice(tensor!, 0, 2), progressTensor));
      } else {
        throw new Error(`Unexpected rate: ${rate}`);
      }
    }) as unknown as Progress<'tensor', undefined>
    await wrapGenerator(
      predict(tensor, {
        patchSize,
        padding: 0,
        progress,
        output: 'tensor',
      }, modelPackage)
    );
    expect(progress).toHaveBeenCalledWith(0.5,
      expect.objectContaining({
        shape: [4, 4, 3,],
      }),
    );
    expect(progress).toHaveBeenCalledWith(1,
      expect.objectContaining({
        shape: [4, 4, 3,],
      }),
    );
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('should invoke progress callback with slice as tensor, if output is a string but progressOutput is tensor', async () => {
    console.warn = jest.fn();
    tensor = getTensor(4, 2).expandDims(0) as tf.Tensor4D;
    const patchSize = 2;
    const getSlice = (t: tf.Tensor, x: number, y: number) => tf.tidy(() => t.slice([0, x, y], [1, patchSize, patchSize]) as tf.Tensor3D);
    const progress = jest.fn((rate: number, progressTensor: tf.Tensor3D) => {
      if (rate === .5) {
        tf.tidy(() => checkStartingTensorAgainstUpscaledTensor(getSlice(tensor!, 0, 0), progressTensor));
      } else if (rate === 1) {
        tf.tidy(() => checkStartingTensorAgainstUpscaledTensor(getSlice(tensor!, 2, 0), progressTensor));
      } else {
        throw new Error(`Unexpected rate: ${rate}`);
      }
    }) as Progress<'src', 'tensor'>
    await wrapGenerator(
      predict(tensor, {
        patchSize,
        padding: 0,
        progress,
        output: 'src',
        progressOutput: 'tensor',
      }, modelPackage)
    );
    expect(progress).toHaveBeenCalledWith(0.5,
      expect.objectContaining({
        shape: [4, 4, 3,],
      }),
    );
    expect(progress).toHaveBeenCalledWith(1,
      expect.objectContaining({
        shape: [4, 4, 3,],
      }),
    );
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('should warn if provided a patchSize without padding', async () => {
    console.warn = jest.fn();
    tensor = getTensor(4, 4).expandDims(0) as tf.Tensor4D;
    const patchSize = 2;
    await wrapGenerator(
      predict(tensor, {
        patchSize,
      }, modelPackage)
    );
    expect(console.warn).toHaveBeenCalledWith(WARNING_UNDEFINED_PADDING);
  });

  it('should warn if provided a progress callback without patchSize', async () => {
    console.warn = jest.fn();
    tensor = getTensor(4, 4).expandDims(0) as tf.Tensor4D;
    await wrapGenerator(
      predict(tensor, {
        progress: () => { },
      }, modelPackage)
    );
    expect(console.warn).toHaveBeenCalledWith(WARNING_PROGRESS_WITHOUT_PATCH_SIZE);
  });

  describe('memory cleanup in predict', () => {
    it('should clear up all memory while running predict without patch size', async () => {
      const IMG_SIZE = 2;
      tensor = getTensor(IMG_SIZE, IMG_SIZE).expandDims(0) as tf.Tensor4D;
      const startingTensors = tf.memory().numTensors;
      const gen = predict(tensor, {}, modelPackage);
      let { value, done } = await gen.next();
      expect(done).toEqual(true);
      expect(Array.isArray(value)).toEqual(false);
      tf.tidy(() => checkStartingTensorAgainstUpscaledTensor(tensor, value as tf.Tensor4D));
      (value as tf.Tensor).dispose();
      expect(tf.memory().numTensors).toEqual(startingTensors);
    });

    it('should clear up all memory while running predict with patch size', async () => {
      console.warn = jest.fn();
      const IMG_SIZE = 4;
      tensor = getTensor(IMG_SIZE, IMG_SIZE).expandDims(0) as tf.Tensor4D;
      const startingTensors = tf.memory().numTensors;
      const patchSize = 2;
      const gen = predict(tensor, {
        patchSize,
      }, modelPackage);

      let currentExpectationIndex = 0;
      const expectations = [
        // 284
        0, 

        // row loop 0
        // 289
        0, 

        // row loop 0, col loop 0
        // 299
        0, 
        // 304
        1, // 1 transitory tensor
        // 307
        1, // 1 transitory tensor
        // 313
        1, // 1 transitory tensor
        // 333
        1, // 1 transitory tensor
        // 337
        1, // 0 transitory tensors, 1 col tensor

        // row loop 0, col loop 1
        // 299
        1, // 0 transitory tensors, 1 col tensor
        // 304
        2, // 1 transitory tensor, 1 col tensor
        // 307
        2, // 1 transitory tensor, 1 col tensor
        // 313
        2, // 1 transitory tensor, 1 col tensor
        // 333
        2, // 1 transitory tensor, 1 col tensor
        // 337
        1, // 0 transitory tensors, 1 col tensor

        // 342
        1, // 0 transitory tensors, 0 col tensor, 1 row tensor

        // row loop 1
        // 289
        1, 

        // row loop 1, col loop 0
        // 299
        1, // 0 transitory tensors, 0 col tensor, 1 row tensor
        // 304
        2, // 1 transitory tensor, 0 col tensor, 1 row tensor
        // 307
        2, // 1 transitory tensor, 0 col tensor, 1 row tensor
        // 313
        2, // 1 transitory tensor, 0 col tensor, 1 row tensor
        // 333
        2, // 1 transitory tensor, 0 col tensor, 1 row tensor
        // 337
        2, // 0 transitory tensor, 1 col tensor, 1 row tensor

        // row loop 1, col loop 1
        // 299
        2, // 0 transitory tensor, 1 col tensor, 1 row tensor
        // 304
        3, // 1 transitory tensor, 1 col tensor, 1 row tensor
        // 307
        3, // 1 transitory tensor, 1 col tensor, 1 row tensor
        // 313
        3, // 1 transitory tensor, 1 col tensor, 1 row tensor
        // 333
        3, // 1 transitory tensor, 1 col tensor, 1 row tensor
        // 337
        2, // 0 transitory tensor, 1 col tensor, 1 row tensor

        // 342
        1, // 0 transitory tensor, 0 col tensor, 1 row tensor
      ]
      let result = await gen.next();
      while (!result.done) {
        const expectation = expectations[currentExpectationIndex];
        const memory = tf.memory();
        const countedTensors = memory.numTensors - startingTensors
        // console.log('|', countedTensors, '|', expectation, '|', 'for', currentExpectationIndex, 'index', '|', result.value);
        expect(countedTensors).toEqual(expectation);
        currentExpectationIndex++;
        result = await gen.next()
      }
      (result.value as tf.Tensor).dispose();
      expect(currentExpectationIndex === expectations.length);
      
      expect(tf.memory().numTensors).toEqual(startingTensors);
    });
  });
});

describe('upscale', () => {
  it('should return a base64 src by default', async () => {
    const img: tf.Tensor3D = tf.tensor([
      [
        [1, 1, 1,],
        [2, 2, 2,],
      ],
      [
        [3, 3, 3,],
        [4, 4, 4,],
      ],
    ]);
    getImageAsTensor.mockImplementation(async () => img.expandDims(0) as tf.Tensor4D);
    const model = {
      predict: jest.fn(() => tf.ones([1, 2, 2, 3,])),
    } as unknown as tf.LayersModel;
    tensorAsBase64.mockImplementation(() => 'foobarbaz4');
    const result = await wrapGenerator(upscale(img, {}, {
      model,
      modelDefinition: { scale: 2, } as ModelDefinition,
    }));
    expect(result).toEqual('foobarbaz4');
  });

  it('should return a tensor if specified', async () => {
    const img: tf.Tensor3D = tf.tensor([
      [
        [1, 1, 1,],
        [2, 2, 2,],
      ],
      [
        [3, 3, 3,],
        [4, 4, 4,],
      ],
    ]);
    getImageAsTensor.mockImplementation(async () => img.expandDims(0) as tf.Tensor4D);
    const upscaledTensor = tf.ones([1, 2, 2, 3,]);
    const model = {
      predict: jest.fn(() => upscaledTensor),
    } as unknown as tf.LayersModel;
    // (mockedTensorAsBase as any).default = async() => 'foobarbaz5';
    const result = await wrapGenerator(upscale(img, { output: 'tensor', }, { 
      model, 
      modelDefinition: { scale: 2, } as ModelDefinition, 
    }));
    if (typeof result === 'string') {
      throw new Error('Unexpected string type');
    }
    expect(result.dataSync()).toEqual(upscaledTensor.dataSync());
  });
});

describe('cancellableUpscale', () => {
  it('is able to cancel an in-flight request', async () => {
    const img: tf.Tensor4D = tf.ones([4, 4, 3,]).expandDims(0);
    getImageAsTensor.mockImplementation(async () => img);
    const scale = 2;
    const patchSize = 2;
    const model = {
      predict: jest.fn((pixel) => {
        return tf
          .fill([patchSize * scale, patchSize * scale, 3,], pixel.dataSync()[0])
          .expandDims(0);
      }),
    } as unknown as tf.LayersModel;
    const controller = new AbortController();
    const progress = jest.fn((rate) => {
      if (rate === .5) {
        controller.abort();
      }
      if (rate > .5) {
        throw new Error(`Rate is too high: ${rate}`);
      }
    });
    await expect(() => cancellableUpscale(img, {
      patchSize,
      padding: 0,
      progress,
      signal: controller.signal,
    }, {
      model, 
      modelDefinition: { scale, } as ModelDefinition, 
      signal: new AbortController().signal,
    }))
      .rejects
      .toThrow(AbortError);
    expect(progress).toHaveBeenCalledWith(0.25);
    expect(progress).toHaveBeenCalledWith(0.5);
    expect(progress).not.toHaveBeenCalledWith(0.75);
    expect(progress).not.toHaveBeenCalledWith(1);
  });

  it('is able to cancel an in-flight request with an internal signal', async () => {
    const img: tf.Tensor4D = tf.ones([4, 4, 3,]).expandDims(0);
    getImageAsTensor.mockImplementation(async () => img);
    const scale = 2;
    const patchSize = 2;
    const model = {
      predict: jest.fn((pixel) => {
        return tf
          .fill([patchSize * scale, patchSize * scale, 3,], pixel.dataSync()[0])
          .expandDims(0);
      }),
    } as unknown as tf.LayersModel;
    const controller = new AbortController();
    const progress = jest.fn((rate) => {
      if (rate === .5) {
        controller.abort();
      }
      if (rate > .5) {
        throw new Error(`Rate is too high: ${rate}`);
      }
    });
    await expect(() => cancellableUpscale(img, {
      patchSize,
      padding: 0,
      progress,
    }, {
      model, 
      modelDefinition: { scale, } as ModelDefinition, 
      signal: controller.signal,
    }))
      .rejects
      .toThrow(AbortError);
    expect(progress).toHaveBeenCalledWith(0.25);
    expect(progress).toHaveBeenCalledWith(0.5);
    expect(progress).not.toHaveBeenCalledWith(0.75);
    expect(progress).not.toHaveBeenCalledWith(1);
  });

  it('returns processed pixels', async () => {
    const mockResponse = 'foobarbaz6';
    tensorAsBase64.mockImplementation(() => mockResponse);
    const img: tf.Tensor4D = tf.ones([4, 4, 3,]).expandDims(0);
    getImageAsTensor.mockImplementation(async () => img);
    const controller = new AbortController();
    const scale = 2;
    const patchSize = 2;
    const predictedPixels = tf
      .fill([patchSize * scale, patchSize * scale, 3,], img.dataSync()[0])
      .expandDims(0);
    const model = {
      predict: jest.fn(() => predictedPixels.clone()),
    } as unknown as tf.LayersModel;
    const result = await cancellableUpscale(img, {
      patchSize,
      padding: 0,
    }, {
      model,
      modelDefinition: { scale, } as ModelDefinition,
      signal: controller.signal,
    });
    expect(result).toEqual(mockResponse);
  });
});

describe('getWidthAndHeight', () => {
  it('throws if given a too small tensor', () => {
    const t = tf.zeros([2,2]) as unknown as tf.Tensor3D;
    expect(() => getWidthAndHeight(t)).toThrow(GET_INVALID_SHAPED_TENSOR(t));
  });

  it('throws if given a too large tensor', () => {
    const t = tf.zeros([2,2,2,2,2]) as unknown as tf.Tensor3D;
    expect(() => getWidthAndHeight(t)).toThrow(GET_INVALID_SHAPED_TENSOR(t));
  });

  it('returns width and height for a 4d tensor', () => {
    expect(getWidthAndHeight(tf.zeros([1,2,3,4]) as tf.Tensor4D)).toEqual([2,3]);
  });

  it('returns width and height for a 3d tensor', () => {
    expect(getWidthAndHeight(tf.zeros([1,2,3]) as tf.Tensor3D)).toEqual([1,2]);
  });
});

describe('makeTick', () => {
  it('disposes of an in-flight tensor', (done) => {
    isTensor.mockImplementation(() => true);
    const abortController = new AbortController();
    const dispose = jest.fn();
    const t = {
      dispose,
    } as unknown as tf.Tensor3D;
    const tick = makeTick(abortController.signal);
    tick(t).then(() => {
      throw new Error('Should have thrown.');
    }).catch(err => {
      expect(dispose).toHaveBeenCalled();
      expect(err instanceof AbortError).toBe(true);
      done();
    });
    abortController.abort();
  }, 100);

  it('disposes of a multiple in-flight tensors', (done) => {
    isTensor.mockImplementation(() => false);
    const abortController = new AbortController();
    const dispose = jest.fn();
    const getTensor = () => ({
      dispose,
    }) as unknown as tf.Tensor3D;
    const mockTensors = Array(3).fill('').map(() => getTensor());
    const tick = makeTick(abortController.signal);
    tick(mockTensors).then(() => {
      throw new Error('Should have thrown.');
    }).catch(err => {
      mockTensors.forEach(t => {
        expect(t.dispose).toHaveBeenCalled();
      });
      expect(err instanceof AbortError).toBe(true);
      done();
    });
    abortController.abort();
  }, 100);

  it('ignores any non-tensor results', (done) => {
    isTensor.mockImplementation(() => false);
    const abortController = new AbortController();
    const tick = makeTick(abortController.signal);
    tick(undefined).then(() => {
      throw new Error('Should have thrown.');
    }).catch(err => {
      expect(err instanceof AbortError).toBe(true);
      done();
    });
    abortController.abort();
  }, 100);
});
