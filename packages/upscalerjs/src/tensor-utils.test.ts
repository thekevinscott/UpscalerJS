import * as tfn from '@tensorflow/tfjs-node';
import { Tensor4D, ones, tensor } from '@tensorflow/tfjs-node';
import { tf as _tf, } from './dependencies.generated';
import { mock, mockFn } from '../../../test/lib/shared/mockers';
import { 
  padInput,
  trimInput,
  scaleIncomingPixels,
  scaleOutput,
  getWidthAndHeight,
  tensorAsClampedArray,
  getTensorDimensions,
  GetTensorDimensionsOpts,
  concatTensors,
  getCopyOfInput,
} from './tensor-utils';
import {
  isValidRange as _isValidRange,
  isFixedShape4D as _isFixedShape4D,
  isTensor as _isTensor,
 } from '@upscalerjs/core';
import {
  tensorAsBase64 as _tensorAsBase64,
  getImageAsTensor as _getImageAsTensor,
} from './image.generated';
import {
  GET_INVALID_SHAPED_TENSOR,
  GET_TENSOR_DIMENSION_ERROR_COL_IS_UNDEFINED,
  GET_TENSOR_DIMENSION_ERROR_HEIGHT_IS_UNDEFINED,
  GET_TENSOR_DIMENSION_ERROR_PATCH_SIZE_IS_UNDEFINED,
  GET_TENSOR_DIMENSION_ERROR_ROW_IS_UNDEFINED,
  GET_TENSOR_DIMENSION_ERROR_WIDTH_IS_UNDEFINED,
  GET_UNDEFINED_TENSORS_ERROR,
} from './errors-and-warnings';

jest.mock('./image.generated', () => {
  const { tensorAsBase64, getImageAsTensor, ...rest } = jest.requireActual('./image.generated');
  return {
    ...rest,
    tensorAsBase64: jest.fn(tensorAsBase64),
    getImageAsTensor: jest.fn(getImageAsTensor),
  };
});

jest.mock('./dependencies.generated', () => {
  const { tf, ...dependencies } = jest.requireActual('./dependencies.generated');
  return {
    ...dependencies,
    tf: {
      ...tf,
      registerOp: jest.fn(),
      loadLayersModel: jest.fn(),
      loadGraphModel: jest.fn(),
    },
  };
});

jest.mock('@upscalerjs/core', () => {
  const { isTensor, isValidRange, isFixedShape4D, ...core } = jest.requireActual('@upscalerjs/core');
  return {
    ...core,
    isTensor: jest.fn().mockImplementation(isTensor),
    isFixedShape4D: jest.fn().mockImplementation(isFixedShape4D),
    isValidRange: jest.fn().mockImplementation(isValidRange),
  };
});

const mockedTf = mock(_tf);
const isFixedShape4D = mockFn(_isFixedShape4D);
const isValidRange = mockFn(_isValidRange);

const isTensor = mockFn(_isTensor);
const tensorAsBase64 = mockFn(_tensorAsBase64);
const getImageAsTensor = mockFn(_getImageAsTensor);

describe('padInput', () => {
  beforeEach(() => {
    isFixedShape4D.mockImplementation(() => true);
  });

  afterEach(() => {
    isFixedShape4D.mockClear();
  });

  it('just returns the input if inputSize is less than the shape of the tensor', () => {
    const t = ones([1, 4, 4, 3]) as Tensor4D;
    expect(padInput([null, 2, 2, 3])(t)).toEqual(t);
  });

  it('just returns the input if inputSize is equal to the width of the tensor', () => {
    const t = ones([1, 4, 8, 3]) as Tensor4D;
    expect(padInput([null, 4, 4, 3])(t)).toEqual(t);
  });

  it('just returns the input if inputSize is equal to the height of the tensor', () => {
    const t = ones([1, 8, 4, 3]) as Tensor4D;
    expect(padInput([null, 4, 4, 3])(t)).toEqual(t);
  });

  it('returns an image with padding if input size is greater than image', () => {
    const t = ones([1, 4, 4, 3]) as Tensor4D;
    const result = padInput([null, 6, 6, 3])(t);
    expect(result).not.toEqual(t);
    expect(result.shape).toEqual([1, 6, 6, 3]);
  });

  it('returns an image with padding if input size is greater than the height', () => {
    const t = ones([1, 4, 8, 3]) as Tensor4D;
    const result = padInput([null, 6, 6, 3])(t);
    expect(result).not.toEqual(t);
    expect(result.shape).toEqual([1, 6, 8, 3]);
  });

  it('returns an image with padding if input size is greater than the width', () => {
    const t = ones([1, 8, 4, 3]) as Tensor4D;
    const result = padInput([null, 6, 6, 3])(t);
    expect(result).not.toEqual(t);
    expect(result.shape).toEqual([1, 8, 6, 3]);
  });
});

describe('trimInput', () => {
  it('just returns the input if width and height are equal to pixels shape', () => {
    const t = ones([1, 4, 4, 3]) as Tensor4D;
    expect(trimInput([1, 4, 4, 3], 1)(t)).toEqual(t);
  });

  it('returns a sliced image if image height is smaller than pixels height', () => {
    const t = ones([1, 4, 4, 3]) as Tensor4D;
    const result = trimInput([1, 2, 4, 3], 1)(t);
    expect(result).not.toEqual(t);
    expect(result.shape).toEqual([1, 2, 4, 3]);
  });

  it('returns a sliced image if image width is smaller than pixels width', () => {
    const t = ones([1, 4, 4, 3]) as Tensor4D;
    const result = trimInput([1, 4, 2, 3], 1)(t);
    expect(result).not.toEqual(t);
    expect(result.shape).toEqual([1, 4, 2, 3]);
  });
});

describe('scaleOutput', () => {
  afterEach(() => {
    isValidRange.mockClear();
  });

  it('returns tensor unchanged if input shape is not valid', () => mockedTf.tidy(() => {
    isValidRange.mockImplementationOnce(() => false);
    const tensor = ones([1, 2, 2, 1]) as Tensor4D;
    expect(Array.from(scaleOutput()(tensor).dataSync())).toEqual(Array.from(tensor.dataSync()));
  }));

  it('returns same tensor values if input shape is 0-255', () => mockedTf.tidy(() => {
    isValidRange.mockImplementationOnce(() => true);
    const tensor = ones([1, 2, 2, 1]) as Tensor4D;
    expect(Array.from(scaleOutput([0, 255])(tensor).dataSync())).toEqual(Array.from(tensor.dataSync()));
  }));

  it('returns multiplied tensor values if input shape is 0-1', () => mockedTf.tidy(() => {
    isValidRange.mockImplementationOnce(() => true);
    const tensor = ones([1, 2, 2, 1]) as Tensor4D;
    expect(Array.from(scaleOutput([0, 1])(tensor).dataSync())).toEqual([255, 255, 255, 255,]);
  }));
});

describe('getWidthAndHeight', () => {
  it('throws if given a too small tensor', () => {
    const t = mockedTf.zeros([2, 2]) as unknown as _tf.Tensor3D;
    expect(() => getWidthAndHeight(t)).toThrow(GET_INVALID_SHAPED_TENSOR(t.shape));
  });

  it('throws if given a too large tensor', () => {
    const t = mockedTf.zeros([2, 2, 2, 2, 2]) as unknown as _tf.Tensor3D;
    expect(() => getWidthAndHeight(t)).toThrow(GET_INVALID_SHAPED_TENSOR(t.shape));
  });

  it('returns width and height for a 4d tensor', () => {
    expect(getWidthAndHeight(mockedTf.zeros([1, 2, 3, 4]) as _tf.Tensor4D)).toEqual([2, 3]);
  });

  it('returns width and height for a 3d tensor', () => {
    expect(getWidthAndHeight(mockedTf.zeros([1, 2, 3]) as _tf.Tensor3D)).toEqual([1, 2]);
  });
});

describe('scaleIncomingPixels', () => {
  beforeEach(() => {
    isValidRange.mockClear();
  });

  it('returns unadulterated incoming pixels if given no range', () => mockedTf.tidy(() => {
    const result = Array.from(scaleIncomingPixels()(mockedTf.tensor4d([[[[0, 127, 255]]]])).dataSync());
    expect(result).toEqual([0, 127, 255]);
  }));

  it('returns unadulterated incoming pixels if given a range of 0-1', () => mockedTf.tidy(() => {
    const result = Array.from(scaleIncomingPixels([0,255])(mockedTf.tensor4d([[[[0, 127, 255]]]])).dataSync());
    expect(result).toEqual([0, 127, 255]);
  }));

  it('scales incoming pixels if given a range of 0-255', () => mockedTf.tidy(() => {
    const result = Array.from(scaleIncomingPixels([0,1])(mockedTf.tensor4d([[[[0, 127, 255]]]])).dataSync().map(n => Math.round(n * 100) / 100));
    expect(result).toEqual([0,.5,1]);
  }));
});

describe('tensorAsClampedArray', () => {
  it('returns an array', () => {
    const result = tensorAsClampedArray(tensor([[[2, 2, 3], [2, 1, 4], [5, 5, 5], [6, 6, 6], [7, 7, 7], [8, 8, 8]]]))
    expect(Array.from(result)).toEqual([2, 2, 3, 255, 2, 1, 4, 255, 5, 5, 5, 255, 6, 6, 6, 255, 7, 7, 7, 255, 8, 8, 8, 255]);
  });

  it('returns a clamped array', () => {
    const result = tensorAsClampedArray(tensor([[[-100, 2, 3], [256, 1, 4], [500, 5, 5], [6, 6, 6]]]))
    expect(Array.from(result)).toEqual([0, 2, 3, 255, 255, 1, 4, 255, 255, 5, 5, 255, 6, 6, 6, 255]);
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

  test.each<[IOpts, IExpectation[]]>([
    [
      { width: 2, height: 2, patchSize: 2, padding: 0, }, 
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
    ],

    [
      { width: 2, height: 2, patchSize: 4, padding: 0, },
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
    ],
  ])(
    "gets tensor dimensions for args %p",
    (opts, expectations) => {
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
    });

  it('gets tensor dimensions for a subset patch size that fits equally', () => {
    const sliceSize: [number, number] = [2, 2,];
    const size: [number, number] = [2, 2,];
    testGetTensorDimensions(
      { width: 4, height: 4, patchSize: 2, padding: 0, },
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

describe('concatTensors', () => {
  beforeEach(() => {
    tensorAsBase64.mockClear();
    getImageAsTensor.mockClear();
    isTensor.mockClear();
  });
  it('concats two tensors together', () => {
    const a: tfn.Tensor3D = mockedTf.tensor(
      [1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4],
      [2, 2, 3,],
    );
    const b: tfn.Tensor3D = mockedTf.tensor(
      [10, 10, 10, 20, 20, 20, 30, 30, 30, 40, 40, 40],
      [2, 2, 3,],
    );
    const axis = 1;
    const expected = mockedTf.concat([a, b], axis);
    const result = concatTensors([a, b], axis);
    expect(result.shape).toEqual([2, 4, 3])
    expect(result.dataSync()).toEqual(expected.dataSync());
    expect(a.isDisposed).toBe(true);
    expect(b.isDisposed).toBe(true);
  });

  it('throws if given no tensors', () => {
    expect(() => concatTensors([undefined, undefined])).toThrowError(GET_UNDEFINED_TENSORS_ERROR);
  });
});

describe('getCopyOfInput', () => {
  it('returns non-tensor input unadulterated', () => {
    const input = { foo: 'foo' } as any;
    expect(getCopyOfInput(input)).toEqual(input);
  });

  it('returns a copy of a given 4d tensor', () => {
    const input: tfn.Tensor4D = tfn.tensor(
      [1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4,],
      [1, 2, 2, 3,],
    );
    expect(getCopyOfInput(input)).not.toEqual(input);
  });

  it('returns a copy of a given 3d tensor', () => {
    const input: tfn.Tensor3D = tfn.tensor(
      [1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4,],
      [2, 2, 3,],
    );
    expect(getCopyOfInput(input)).not.toEqual(input);
  });
});
