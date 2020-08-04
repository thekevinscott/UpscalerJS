import * as tf from '@tensorflow/tfjs';
import upscale, {
  predict,
  getRowsAndColumns,
  getTensorDimensions,
} from './upscale';
jest.mock('./image');
jest.mock('tensor-as-base64');
import * as tensorAsBase from 'tensor-as-base64';
import * as image from './image';

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
        expectation: { origin, size, sliceOrigin = [0, 0], sliceSize },
      } = expectations[i];
      try {
        expect(
          getTensorDimensions(
            row,
            col,
            opts.patchSize,
            opts.padding,
            opts.height,
            opts.width,
          ),
        ).toEqual({
          origin,
          size,
          sliceOrigin,
          sliceSize,
        });
      } catch (err) {
        err.message = `*******\n${row} | ${col}\n*******\n${err.message}`;
        throw err;
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
            origin: [0, 0],
            size: [2, 2],
            sliceSize: [2, 2],
          },
        },
      ],
    );
  });

  it('gets tensor dimensions for a subset patch size that fits equally', () => {
    const sliceSize: [number, number] = [2, 2];
    const size: [number, number] = [2, 2];
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
            origin: [0, 0],
            size,
            sliceSize,
          },
        },
        {
          row: 1,
          col: 0,
          expectation: {
            origin: [2, 0],
            size,
            sliceSize,
          },
        },
        {
          row: 0,
          col: 1,
          expectation: {
            origin: [0, 2],
            size,
            sliceSize,
          },
        },
        {
          row: 1,
          col: 1,
          expectation: {
            origin: [2, 2],
            size,
            sliceSize,
          },
        },
      ],
    );
  });

  it('gets tensor dimensions for a subset patch size that is unequal', () => {
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
            origin: [0, 0],
            size: [4, 4],
            sliceSize: [4, 4],
          },
        },
        {
          row: 1,
          col: 0,
          expectation: {
            origin: [4, 0],
            size: [2, 4],
            sliceSize: [2, 4],
          },
        },
        {
          row: 0,
          col: 1,
          expectation: {
            origin: [0, 4],
            size: [4, 2],
            sliceSize: [4, 2],
          },
        },
        {
          row: 1,
          col: 1,
          expectation: {
            origin: [4, 4],
            size: [2, 2],
            sliceSize: [2, 2],
          },
        },
      ],
    );
  });

  it('gets tensor dimensions for an uneven subset patch size that fits equally', () => {
    const size: [number, number] = [2, 2];
    const sliceSize: [number, number] = [2, 2];
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
            origin: [0, 0],
            size,
            sliceSize,
          },
        },
        {
          row: 1,
          col: 0,
          expectation: {
            origin: [2, 0],
            size,
            sliceSize,
          },
        },
        {
          row: 0,
          col: 1,
          expectation: {
            origin: [0, 2],
            size,
            sliceSize,
          },
        },
        {
          row: 1,
          col: 1,
          expectation: {
            origin: [2, 2],
            size,
            sliceSize,
          },
        },
        {
          row: 0,
          col: 2,
          expectation: {
            origin: [0, 4],
            size,
            sliceSize,
          },
        },
        {
          row: 1,
          col: 2,
          expectation: {
            origin: [2, 4],
            size,
            sliceSize,
          },
        },
      ],
    );
  });

  it('gets tensor dimensions for an uneven subset patch size that fits unequally', () => {
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
            origin: [0, 0],
            size: [4, 4],
            sliceSize: [4, 4],
          },
        },
        {
          row: 1,
          col: 0,
          expectation: {
            origin: [4, 0],
            size: [1, 4],
            sliceSize: [1, 4],
          },
        },
        {
          row: 0,
          col: 1,
          expectation: {
            origin: [0, 4],
            size: [4, 4],
            sliceSize: [4, 4],
          },
        },
        {
          row: 1,
          col: 1,
          expectation: {
            origin: [4, 4],
            size: [1, 4],
            sliceSize: [1, 4],
          },
        },
        {
          row: 0,
          col: 2,
          expectation: {
            origin: [0, 8],
            size: [4, 2],
            sliceSize: [4, 2],
          },
        },
        {
          row: 1,
          col: 2,
          expectation: {
            origin: [4, 8],
            size: [1, 2],
            sliceSize: [1, 2],
          },
        },
      ],
    );
  });

  describe('Padding', () => {
    it('gets tensor dimensions for a fully-covered patch size with padding', () => {
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
              origin: [0, 0],
              size: [2, 2],
              sliceSize: [2, 2],
            },
          },
        ],
      );
    });

    it('gets tensor dimensions for a subset patch size that fits equally with padding', () => {
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
              origin: [0, 0],
              size: [4, 4],
              sliceOrigin: [0, 0],
              sliceSize: [3, 3],
            },
          },
          {
            row: 1,
            col: 0,
            expectation: {
              origin: [2, 0],
              size: [5, 4],
              sliceOrigin: [1, 0],
              sliceSize: [3, 3],
            },
          },
          {
            row: 2,
            col: 0,
            expectation: {
              origin: [5, 0],
              size: [4, 4],
              sliceOrigin: [1, 0],
              sliceSize: [3, 3],
            },
          },
          {
            row: 0,
            col: 1,
            expectation: {
              origin: [0, 2],
              size: [4, 5],
              sliceOrigin: [0, 1],
              sliceSize: [3, 3],
            },
          },
          {
            row: 1,
            col: 1,
            expectation: {
              origin: [2, 2],
              size: [5, 5],
              sliceOrigin: [1, 1],
              sliceSize: [3, 3],
            },
          },
          {
            row: 2,
            col: 1,
            expectation: {
              origin: [5, 2],
              size: [4, 5],
              sliceOrigin: [1, 1],
              sliceSize: [3, 3],
            },
          },
          {
            row: 0,
            col: 2,
            expectation: {
              origin: [0, 5],
              size: [4, 4],
              sliceOrigin: [0, 1],
              sliceSize: [3, 3],
            },
          },
          {
            row: 1,
            col: 2,
            expectation: {
              origin: [2, 5],
              size: [5, 4],
              sliceOrigin: [1, 1],
              sliceSize: [3, 3],
            },
          },
          {
            row: 2,
            col: 2,
            expectation: {
              origin: [5, 5],
              size: [4, 4],
              sliceOrigin: [1, 1],
              sliceSize: [3, 3],
            },
          },
        ],
      );
    });

    it('gets tensor dimensions for a subset patch size that is unequal with padding', () => {
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
              origin: [0, 0],
              size: [5, 5],
              sliceOrigin: [0, 0],
              sliceSize: [4, 4],
            },
          },
          {
            row: 1,
            col: 0,
            expectation: {
              origin: [3, 0],
              size: [6, 5],
              sliceOrigin: [1, 0],
              sliceSize: [4, 4],
            },
          },
          {
            row: 2,
            col: 0,
            expectation: {
              origin: [7, 0],
              size: [2, 5],
              sliceOrigin: [1, 0],
              sliceSize: [1, 4],
            },
          },
          {
            row: 0,
            col: 1,
            expectation: {
              origin: [0, 3],
              size: [5, 6],
              sliceOrigin: [0, 1],
              sliceSize: [4, 4],
            },
          },
          {
            row: 1,
            col: 1,
            expectation: {
              origin: [3, 3],
              size: [6, 6],
              sliceOrigin: [1, 1],
              sliceSize: [4, 4],
            },
          },
          {
            row: 2,
            col: 1,
            expectation: {
              origin: [7, 3],
              size: [2, 6],
              sliceOrigin: [1, 1],
              sliceSize: [1, 4],
            },
          },
          {
            row: 0,
            col: 2,
            expectation: {
              origin: [0, 7],
              size: [5, 2],
              sliceOrigin: [0, 1],
              sliceSize: [4, 1],
            },
          },
          {
            row: 1,
            col: 2,
            expectation: {
              origin: [3, 7],
              size: [6, 2],
              sliceOrigin: [1, 1],
              sliceSize: [4, 1],
            },
          },
          {
            row: 2,
            col: 2,
            expectation: {
              origin: [7, 7],
              size: [2, 2],
              sliceOrigin: [1, 1],
              sliceSize: [1, 1],
            },
          },
        ],
      );
    });

    it('gets tensor dimensions for an uneven subset patch size that fits equally with padding', () => {
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
              origin: [0, 0],
              size: [4, 4],
              sliceOrigin: [0, 0],
              sliceSize: [3, 3],
            },
          },
          {
            row: 1,
            col: 0,
            expectation: {
              origin: [2, 0],
              size: [4, 4],
              sliceOrigin: [1, 0],
              sliceSize: [3, 3],
            },
          },
          {
            row: 0,
            col: 1,
            expectation: {
              origin: [0, 2],
              size: [4, 5],
              sliceOrigin: [0, 1],
              sliceSize: [3, 3],
            },
          },
          {
            row: 1,
            col: 1,
            expectation: {
              origin: [2, 2],
              size: [4, 5],
              sliceOrigin: [1, 1],
              sliceSize: [3, 3],
            },
          },
          {
            row: 0,
            col: 2,
            expectation: {
              origin: [0, 5],
              size: [4, 4],
              sliceOrigin: [0, 1],
              sliceSize: [3, 3],
            },
          },
          {
            row: 1,
            col: 2,
            expectation: {
              origin: [2, 5],
              size: [4, 4],
              sliceOrigin: [1, 1],
              sliceSize: [3, 3],
            },
          },
        ],
      );
    });

    it('gets tensor dimensions for an uneven subset patch size that fits unequally with padding', () => {
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
              origin: [0, 0],
              size: [5, 5],
              sliceOrigin: [0, 0],
              sliceSize: [4, 4],
            },
          },
          {
            row: 1,
            col: 0,
            expectation: {
              origin: [3, 0],
              size: [3, 5],
              sliceOrigin: [1, 0],
              sliceSize: [2, 4],
            },
          },
          {
            row: 0,
            col: 1,
            expectation: {
              origin: [0, 3],
              size: [5, 6],
              sliceOrigin: [0, 1],
              sliceSize: [4, 4],
            },
          },
          {
            row: 1,
            col: 1,
            expectation: {
              origin: [3, 3],
              size: [3, 6],
              sliceOrigin: [1, 1],
              sliceSize: [2, 4],
            },
          },
          {
            row: 0,
            col: 2,
            expectation: {
              origin: [0, 7],
              size: [5, 2],
              sliceOrigin: [0, 1],
              sliceSize: [4, 1],
            },
          },
          {
            row: 1,
            col: 2,
            expectation: {
              origin: [3, 7],
              size: [3, 2],
              sliceOrigin: [1, 1],
              sliceSize: [2, 1],
            },
          },
        ],
      );
    });

    it('gets tensor dimensions for a very small patch size', () => {
      testGetTensorDimensions(
        {
          width: 13,
          height: 2,
          patchSize: 1,
          padding: 8,
        },
        [
          {
            row: 0,
            col: 0,
            expectation: {
              origin: [0, 0],
              size: [2, 9],
              sliceOrigin: [0, 0],
              sliceSize: [1, 1],
            },
          },
          {
            row: 1,
            col: 0,
            expectation: {
              origin: [0, 0],
              size: [2, 9],
              sliceOrigin: [1, 0],
              sliceSize: [1, 1],
            },
          },
          {
            row: 0,
            col: 8,
            expectation: {
              origin: [0, 0],
              size: [2, 13],
              sliceOrigin: [0, 8],
              sliceSize: [1, 1],
            },
          },
          {
            row: 1,
            col: 8,
            expectation: {
              origin: [0, 0],
              size: [2, 13],
              sliceOrigin: [1, 8],
              sliceSize: [1, 1],
            },
          },
        ],
      );
    });
  });
});

describe('getRowsAndColumns', () => {
  it('gets rows and columns', () => {
    const img: tf.Tensor4D = tf.tensor(
      [1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4],
      [1, 2, 2, 3],
    );

    expect(getRowsAndColumns(img, 1)).toEqual({
      rows: 2,
      columns: 2,
    });
  });

  it('gets single row and column for a greater-than patch size', () => {
    const img: tf.Tensor4D = tf.tensor(
      [1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4],
      [1, 2, 2, 3],
    );

    expect(getRowsAndColumns(img, 3)).toEqual({
      rows: 1,
      columns: 1,
    });
  });

  it('gets uneven rows and columns by rounding up', () => {
    const img: tf.Tensor4D = tf.tensor(
      [
        1,
        1,
        1,
        2,
        2,
        2,
        3,
        3,
        3,
        4,
        4,
        4,
        5,
        5,
        5,
        6,
        6,
        6,
        7,
        7,
        7,
        8,
        8,
        8,
        9,
        9,
        9,
      ],
      [1, 3, 3, 3],
    );

    expect(getRowsAndColumns(img, 2)).toEqual({
      rows: 2,
      columns: 2,
    });
  });
});

describe('predict', () => {
  it('should make a prediction', async () => {
    const img: tf.Tensor3D = tf.tensor(
      [1, 2, 3, 4, 1, 2, 3, 4, 1, 2, 3, 4],
      [2, 2, 3],
    );
    const pred = {
      squeeze: jest.fn(() => 'foo'),
    };
    const model = ({
      predict: jest.fn(() => pred),
    } as unknown) as tf.LayersModel;
    const result = await predict(model, img.expandDims(0), 2);
    expect(model.predict).toHaveBeenCalledWith(
      expect.objectContaining({
        shape: [1, 2, 2, 3],
      }),
    );
    expect(pred.squeeze).toHaveBeenCalled();
    expect(result).toEqual('foo');
  });

  it('should make a prediction with a patchSize', async () => {
    const img: tf.Tensor3D = tf.tensor(
      [1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4],
      [2, 2, 3],
    );
    const model = ({
      predict: jest.fn((pixel) => {
        return tf.fill([2, 2, 3], pixel.dataSync()[0]).expandDims(0);
      }),
    } as unknown) as tf.LayersModel;
    const result = await predict(model, img.expandDims(0), 2, {
      patchSize: 1,
      padding: 0,
    });
    expect(result.dataSync()).toEqual(
      tf
        .tensor([
          [
            [1, 1, 1],
            [1, 1, 1],
            [2, 2, 2],
            [2, 2, 2],
          ],
          [
            [1, 1, 1],
            [1, 1, 1],
            [2, 2, 2],
            [2, 2, 2],
          ],
          [
            [3, 3, 3],
            [3, 3, 3],
            [4, 4, 4],
            [4, 4, 4],
          ],
          [
            [3, 3, 3],
            [3, 3, 3],
            [4, 4, 4],
            [4, 4, 4],
          ],
        ])
        .expandDims(0)
        .dataSync(),
    );
  });

  it('should callback with progress on patchSize', async () => {
    const img: tf.Tensor4D = tf.ones([4, 4, 3]).expandDims(0);
    const scale = 2;
    const patchSize = 2;
    const model = ({
      predict: jest.fn((pixel) => {
        return tf
          .fill([patchSize * scale, patchSize * scale, 3], pixel.dataSync()[0])
          .expandDims(0);
      }),
    } as unknown) as tf.LayersModel;
    const progress = jest.fn();
    await predict(model, img, scale, {
      patchSize,
      padding: 0,
      progress,
    });
    expect(progress).toHaveBeenCalledWith(0.25);
    expect(progress).toHaveBeenCalledWith(0.5);
    expect(progress).toHaveBeenCalledWith(0.75);
    expect(progress).toHaveBeenCalledWith(1);
  });
});

describe('upscale', () => {
  it('should return a base64 src by default', async () => {
    const img: tf.Tensor3D = tf.tensor([
      [
        [1, 1, 1],
        [2, 2, 2],
      ],
      [
        [3, 3, 3],
        [4, 4, 4],
      ],
    ]);
    (image as any).getImageAsPixels = () => img;
    const pred = {
      squeeze: jest.fn(() => 'foo'),
      dispose: jest.fn(),
    };
    const model = ({
      predict: jest.fn(() => pred),
    } as unknown) as tf.LayersModel;
    (tensorAsBase as any).default = () => 'foobarbaz';
    const result = await upscale(model, img, 2);
    expect(result).toEqual('foobarbaz');
  });

  it('should return a tensor if specified', async () => {
    const img: tf.Tensor3D = tf.tensor([
      [
        [1, 1, 1],
        [2, 2, 2],
      ],
      [
        [3, 3, 3],
        [4, 4, 4],
      ],
    ]);
    (image as any).getImageAsPixels = () => img;
    const predOutput = 'foo';
    const pred = {
      squeeze: jest.fn(() => predOutput),
      dispose: jest.fn(),
    };
    const model = ({
      predict: jest.fn(() => pred),
    } as unknown) as tf.LayersModel;
    (tensorAsBase as any).default = () => 'foobarbaz';
    const result = await upscale(model, img, 2, {
      output: 'tensor',
    });
    expect(result).toEqual(predOutput);
  });
});
