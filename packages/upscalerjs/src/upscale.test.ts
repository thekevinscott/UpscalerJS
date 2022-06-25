import { tf } from './dependencies.generated';
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
} from './upscale';
import { wrapGenerator, isTensor } from './utils';
import * as tensorAsBase from 'tensor-as-base64';
import * as image from './image.generated';
import { ModelDefinition, Progress, } from './types';
jest.mock('./image.generated', () => ({
  ...jest.requireActual('./image.generated'),
}));
jest.mock('tensor-as-base64');

const mockedImage = image as jest.Mocked<typeof image>;
const mockedTensorAsBase = tensorAsBase as jest.Mocked<typeof tensorAsBase>;

describe('concatTensors', () => {
  beforeEach(() => {
    // (mockedImage as any).default.mockClear();
    // (mockedTensorAsBase as any).default.mockClear();
  })
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

describe('getConsistentTensorDimensions', () => {
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
  afterEach(() => {
    console.warn = origWarn;
  });

  it('should make a prediction', async () => {
    const img: tf.Tensor3D = tf.tensor(
      [1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4,],
      [2, 2, 3,],
    );
    const upscaledTensor = tf.ones([1, 2, 2, 3,]);
    const pred = {
      squeeze: jest.fn(() => upscaledTensor),
      dispose: jest.fn(),
    };
    const model = {
      predict: jest.fn(() => pred),
    } as unknown as tf.LayersModel;
    const result = await wrapGenerator(
      predict(img.expandDims(0), {
      }, { model, modelDefinition: { scale: 2, } as ModelDefinition })
    );
    expect(model.predict).toHaveBeenCalledWith(
      expect.objectContaining({
        shape: [1, 2, 2, 3,],
      }),
    );
    expect(result).toEqual(upscaledTensor);
  });

  it('should make a prediction with a patchSize', async () => {
    const img: tf.Tensor3D = tf.tensor(
      [1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4,],
      [2, 2, 3,],
    );
    const model = {
      predict: jest.fn((pixel) => {
        return tf.fill([2, 2, 3,], pixel.dataSync()[0]).expandDims(0);
      }),
    } as unknown as tf.LayersModel;
    const result = await wrapGenerator(predict(
      img.expandDims(0),
      {
        patchSize: 1,
        padding: 0,
      },
      {
        model,
        modelDefinition: { scale: 2, } as ModelDefinition,
      }
    ));
    expect(result.dataSync()).toEqual(
      tf
        .tensor([
          [
            [1, 1, 1,],
            [1, 1, 1,],
            [2, 2, 2,],
            [2, 2, 2,],
          ],
          [
            [1, 1, 1,],
            [1, 1, 1,],
            [2, 2, 2,],
            [2, 2, 2,],
          ],
          [
            [3, 3, 3,],
            [3, 3, 3,],
            [4, 4, 4,],
            [4, 4, 4,],
          ],
          [
            [3, 3, 3,],
            [3, 3, 3,],
            [4, 4, 4,],
            [4, 4, 4,],
          ],
        ])
        .expandDims(0)
        .dataSync(),
    );
  });

  it('should callback with progress on patchSize', async () => {
    console.warn = jest.fn();
    const img: tf.Tensor4D = tf.ones([4, 4, 3,]).expandDims(0);
    const scale = 2;
    const patchSize = 2;
    const model = {
      predict: jest.fn((pixel) => {
        return tf
          .fill([patchSize * scale, patchSize * scale, 3,], pixel.dataSync()[0])
          .expandDims(0);
      }),
    } as unknown as tf.LayersModel;
    const progress = jest.fn();
    await wrapGenerator(
      predict(img, {
        patchSize,
        padding: 0,
        progress,
      }, { model, modelDefinition: { scale, } as ModelDefinition })
    );
    expect(progress).toHaveBeenCalledWith(0.25);
    expect(progress).toHaveBeenCalledWith(0.5);
    expect(progress).toHaveBeenCalledWith(0.75);
    expect(progress).toHaveBeenCalledWith(1);
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('should invoke progress callback with percent and slice', async () => {
    console.warn = jest.fn();
    const mockResponse = 'foobarbaz';
    (mockedTensorAsBase as any).default = async() => mockResponse;
    const img: tf.Tensor4D = tf.ones([4, 2, 3,]).expandDims(0);
    const scale = 2;
    const patchSize = 2;
    const model = {
      predict: jest.fn((pixel) => {
        return tf
          .fill([patchSize * scale, patchSize * scale, 3,], pixel.dataSync()[0])
          .expandDims(0);
      }),
    } as unknown as tf.LayersModel;
    const progress = jest.fn((_1: any, _2: any) => {});
    await wrapGenerator(
      predict(img, {
        patchSize,
        padding: 0,
        progress,
      }, { model, modelDefinition: { scale, } as ModelDefinition })
    );
    expect(progress).toHaveBeenCalledWith(0.5, mockResponse);
    expect(progress).toHaveBeenCalledWith(1, mockResponse);
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('should invoke progress callback with slice as tensor, if output is a tensor', async () => {
    console.warn = jest.fn();
    (mockedTensorAsBase as any).default = async() => 'foobarbaz';
    const img: tf.Tensor4D = tf.tensor([
      [
        [1, 1, 1,],
        [2, 2, 2,],
      ],
      [
        [3, 3, 3,],
        [4, 4, 4,],
      ],
      [
        [5, 5, 5,],
        [6, 6, 6],
      ],
      [
        [7, 7, 7],
        [8, 8, 8],
      ],
    ]).expandDims(0);
    const scale = 2;
    const patchSize = 2;
    const model = tf.sequential();
    model.add(tf.layers.upSampling2d({
      size: [scale, scale], 
      dataFormat: 'channelsLast', 
      inputShape: [null, null, 3],
    }))
    model.compile({ loss: "meanSquaredError", optimizer: "sgd" });
    const progress = jest.fn((rate: number, tensor: tf.Tensor3D) => {
      const data = Array.from(tensor.dataSync());
      if (rate === .5) {
        expect(data).toEqual([
          ...Array(6).fill(1),
          ...Array(6).fill(2),
          ...Array(6).fill(1),
          ...Array(6).fill(2),
          ...Array(6).fill(3),
          ...Array(6).fill(4),
          ...Array(6).fill(3),
          ...Array(6).fill(4),
        ]);
      } else {
        expect(data).toEqual([
          ...Array(6).fill(5),
          ...Array(6).fill(6),
          ...Array(6).fill(5),
          ...Array(6).fill(6),
          ...Array(6).fill(7),
          ...Array(6).fill(8),
          ...Array(6).fill(7),
          ...Array(6).fill(8),
        ]);
      }
    }) as unknown as Progress<'tensor', undefined>
    await wrapGenerator(
      predict(img, {
        patchSize,
        padding: 0,
        progress,
        output: 'tensor',
      }, { model, modelDefinition: { scale, } as ModelDefinition })
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
    (mockedTensorAsBase as any).default = async() => 'foobarbaz';
    const img: tf.Tensor4D = tf.tensor([
      [
        [1, 1, 1,],
        [2, 2, 2,],
      ],
      [
        [3, 3, 3,],
        [4, 4, 4,],
      ],
      [
        [5, 5, 5,],
        [6, 6, 6],
      ],
      [
        [7, 7, 7],
        [8, 8, 8],
      ],
    ]).expandDims(0);
    const scale = 2;
    const patchSize = 2;
    const model = tf.sequential();
    model.add(tf.layers.upSampling2d({
      size: [scale, scale], 
      dataFormat: 'channelsLast', 
      inputShape: [null, null, 3],
    }))
    model.compile({ loss: "meanSquaredError", optimizer: "sgd" });
    const progress = jest.fn((rate: number, tensor: tf.Tensor3D) => {
      const data = Array.from(tensor.dataSync());
      if (rate === .5) {
        expect(data).toEqual([
          ...Array(6).fill(1),
          ...Array(6).fill(2),
          ...Array(6).fill(1),
          ...Array(6).fill(2),
          ...Array(6).fill(3),
          ...Array(6).fill(4),
          ...Array(6).fill(3),
          ...Array(6).fill(4),
        ]);
      } else {
        expect(data).toEqual([
          ...Array(6).fill(5),
          ...Array(6).fill(6),
          ...Array(6).fill(5),
          ...Array(6).fill(6),
          ...Array(6).fill(7),
          ...Array(6).fill(8),
          ...Array(6).fill(7),
          ...Array(6).fill(8),
        ]);
      }
    }) as Progress<'src', 'tensor'>
    await wrapGenerator(
      predict(img, {
        patchSize,
        padding: 0,
        progress,
        output: 'src',
        progressOutput: 'tensor',
      }, { model, modelDefinition: { scale, } as ModelDefinition })
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
    const img: tf.Tensor4D = tf.ones([4, 4, 3,]).expandDims(0);
    const scale = 2;
    const patchSize = 2;
    const model = {
      predict: jest.fn((pixel) => {
        return tf
          .fill([patchSize * scale, patchSize * scale, 3,], pixel.dataSync()[0])
          .expandDims(0);
      }),
    } as unknown as tf.LayersModel;
    await wrapGenerator(
      predict(img, {
        patchSize,
      }, { model, modelDefinition: { scale, } as ModelDefinition })
    );
    expect(console.warn).toHaveBeenCalledWith(WARNING_UNDEFINED_PADDING);
  });

  it('should warn if provided a progress callback without patchSize', async () => {
    console.warn = jest.fn();
    const img: tf.Tensor4D = tf.ones([4, 4, 3,]).expandDims(0);
    const scale = 2;
    const patchSize = 2;
    const model = {
      predict: jest.fn((pixel) => {
        return tf
          .fill([patchSize * scale, patchSize * scale, 3,], pixel.dataSync()[0])
          .expandDims(0);
      }),
    } as unknown as tf.LayersModel;
    await wrapGenerator(
      predict(img, {
        progress: () => { },
      }, { model, modelDefinition: { scale, } as ModelDefinition })
    );
    expect(console.warn).toHaveBeenCalledWith(WARNING_PROGRESS_WITHOUT_PATCH_SIZE);
  });

  describe('memory cleanup in predict', () => {
    it('should clear up all memory while running predict without patch size', async () => {
      const img: tf.Tensor4D = tf.tidy(() => tf.ones([4, 4, 3,]).expandDims(0));
      const startingTensors = tf.memory().numTensors;
      const scale = 2;
      const patchSize = 2;
      const model = {
        predict: (pixel: any) => tf.tidy(() => tf
          .fill([patchSize * scale, patchSize * scale, 3,], pixel.dataSync()[0])
          .expandDims(0)),
      } as unknown as tf.LayersModel;
      const gen = predict(img, {}, { model, modelDefinition: { scale, } as ModelDefinition });
      let { value, done } = await gen.next();
      expect(done).toEqual(true);
      expect(Array.isArray(value)).toEqual(false);
      expect((value as tf.Tensor).dataSync()).toEqual(img.dataSync());
      (value as tf.Tensor).dispose();
      expect(tf.memory().numTensors).toEqual(startingTensors);
      img.dispose();
    });

    it('should clear up all memory while running predict with patch size', async () => {
      const IMG_SIZE = 4;
      const img: tf.Tensor4D = tf.tidy(() => tf.ones([IMG_SIZE, IMG_SIZE, 3,]).expandDims(0));
      const startingTensors = tf.memory().numTensors;
      const scale = 2;
      const patchSize = 2;
      const model = {
        predict: (pixel: any) => tf.tidy(() => tf
          .fill([patchSize * scale, patchSize * scale, 3,], pixel.dataSync()[0])
          .expandDims(0)),
      } as unknown as tf.LayersModel;
      const gen = predict(img, {
        patchSize,
      }, { model, modelDefinition: { scale, } as ModelDefinition });

      let count = 0;
      const getColExpectations = () => ([
        {count: startingTensors + 2 },
        {count: startingTensors + 3 },
        {count: startingTensors + 3 },
        {count: startingTensors + 3 },
        {count: startingTensors + 3 },
        {count: startingTensors + 2 },
      ]);
      const getRowExpectations = () => ([
        // for row loop, row = 0
        {count: startingTensors + 2 },
        // for col loop, row = 0, col = 0
        ...getColExpectations(),
        // for col loop, row = 0, col = 1
        ...getColExpectations(),
        // for row loop, row = 0
        {count: startingTensors + 1 },
      ]);
      const expectations: Array<{count: number, shouldDispose?: boolean}> = [
        {count: startingTensors, },
        {count: startingTensors + 1 },

        // for row loop, row = 0
        ...getRowExpectations(),

        // for row loop, row = 1
        ...getRowExpectations(),
      ];
      let result = await gen.next();
      while (!result.done) {
        const expectation = expectations[count];
        // console.log('memory', result, count, tf.memory(), expectation);
        expect(tf.memory().numTensors).toEqual(expectation.count);
        if (expectation.shouldDispose) {
          if (Array.isArray(result.value)) {
            result.value.forEach(t => t.dispose());
          } else if (isTensor(result.value)) {
            result.value.dispose();
          }
        }
        count++;
        result = await gen.next()
      }
      (result.value as tf.Tensor).dispose();
      expect(count === expectations.length);
      
      expect(tf.memory().numTensors).toEqual(startingTensors);
      img.dispose();
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
    (mockedImage as any).default.getImageAsTensor = () => img;
    const model = {
      predict: jest.fn(() => tf.ones([1, 2, 2, 3,])),
    } as unknown as tf.LayersModel;
    (mockedTensorAsBase as any).default = async() => 'foobarbaz';
    const result = await wrapGenerator(upscale(img, {}, {
      model,
      modelDefinition: { scale: 2, } as ModelDefinition,
    }));
    expect(result).toEqual('foobarbaz');
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
    (mockedImage as any).default.getImageAsTensor = () => img;
    const upscaledTensor = tf.ones([1, 2, 2, 3,]);
    const model = {
      predict: jest.fn(() => upscaledTensor),
    } as unknown as tf.LayersModel;
    (mockedTensorAsBase as any).default = async() => 'foobarbaz';
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
    (mockedImage as any).default.getImageAsTensor = () => img;
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
    (mockedImage as any).default.getImageAsTensor = () => img;
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
});
