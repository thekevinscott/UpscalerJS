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
  it('gets full size if patchSize is equal to size', () => {
    const row = 0;
    const col = 0;
    const patchSize = 64;
    const padding = 0;
    const scale = 2;
    const height = 64;
    const width = 64;
    expect(
      getTensorDimensions(row, col, patchSize, padding, scale, height, width),
    ).toEqual({
      origin: [0, 0, 0],
      size: [-1, patchSize, patchSize],
      sliceOrigin: [0, 0, 0],
      sliceSize: [-1, height * scale, width * scale],
    });
  });

  it('gets a subset of size if patch size is smaller', () => {
    const row = 0;
    const col = 0;
    const patchSize = 2;
    const padding = 0;
    const scale = 2;
    const height = 4;
    const width = 4;
    expect(
      getTensorDimensions(row, col, patchSize, padding, scale, height, width),
    ).toEqual({
      origin: [0, 0, 0],
      size: [-1, 2, 2],
      sliceOrigin: [0, 0, 0],
      sliceSize: [-1, 4, 4],
    });
  });

  it('gets a subset of size if patch size is smaller for an ending column and row', () => {
    const row = 1;
    const col = 1;
    const patchSize = 2;
    const padding = 0;
    const scale = 2;
    const height = 4;
    const width = 4;
    expect(
      getTensorDimensions(row, col, patchSize, padding, scale, height, width),
    ).toEqual({
      origin: [0, 2, 2],
      size: [-1, 2, 2],
      sliceOrigin: [0, 0, 0],
      sliceSize: [-1, 4, 4],
    });
  });

  it('gets a subset of size if patch size is smaller with padding', () => {
    const row = 0;
    const col = 0;
    const patchSize = 3;
    const padding = 1;
    const scale = 2;
    const height = 9;
    const width = 9;
    expect(
      getTensorDimensions(row, col, patchSize, padding, scale, height, width),
    ).toEqual({
      origin: [0, 0, 0],
      size: [-1, 4, 4],
      sliceOrigin: [0, 0, 0],
      sliceSize: [-1, 6, 6],
    });
  });

  it('gets a subset of size if patch size is smaller for an ending column and row with padding', () => {
    const row = 1;
    const col = 1;
    const patchSize = 3;
    const padding = 1;
    const scale = 2;
    const height = 9;
    const width = 9;
    expect(
      getTensorDimensions(row, col, patchSize, padding, scale, height, width),
    ).toEqual({
      origin: [0, 2, 2],
      size: [-1, 5, 5],
      sliceOrigin: [0, 2, 2],
      sliceSize: [-1, 6, 6],
    });
  });

  it('gets a fully padded square if it is in the middle', () => {
    const row = 1;
    const col = 1;
    const patchSize = 3;
    const padding = 1;
    const scale = 2;
    const height = 9;
    const width = 9;
    expect(
      getTensorDimensions(row, col, patchSize, padding, scale, height, width),
    ).toEqual({
      origin: [0, 2, 2],
      size: [-1, 5, 5],
      sliceOrigin: [0, 2, 2],
      sliceSize: [-1, 6, 6],
    });
  });

  it('gets part of a patch if it is a remainder', () => {
    const row = 2;
    const col = 0;
    const patchSize = 5;
    const padding = 0;
    const scale = 2;
    const height = 12;
    const width = 12;
    expect(
      getTensorDimensions(row, col, patchSize, padding, scale, height, width),
    ).toEqual({
      origin: [0, 0, 10],
      size: [-1, 5, 2],
      sliceOrigin: [0, 0, 0],
      sliceSize: [-1, 10, 4],
    });
  });

  it('gets part of a patch with padding if it is a remainder', () => {
    const row = 2;
    const col = 0;
    const patchSize = 5;
    const padding = 1;
    const scale = 2;
    const height = 12;
    const width = 12;
    expect(
      getTensorDimensions(row, col, patchSize, padding, scale, height, width),
    ).toEqual({
      origin: [0, 0, 9],
      size: [-1, 6, 3],
      sliceOrigin: [0, 0, 2],
      sliceSize: [-1, 10, 4],
    });
  });

  it('gets part of a patch with padding if it is a remainder', () => {
    const row = 2;
    const col = 0;
    const patchSize = 5;
    const padding = 1;
    const scale = 2;
    const height = 12;
    const width = 12;
    expect(
      getTensorDimensions(row, col, patchSize, padding, scale, height, width),
    ).toEqual({
      origin: [0, 0, 9],
      size: [-1, 6, 3],
      sliceOrigin: [0, 0, 2],
      sliceSize: [-1, 10, 4],
    });
  });

  it('gets at least a minimum if it is a remainder', () => {
    const row = 2;
    const col = 0;
    const patchSize = 5;
    const padding = 1;
    const scale = 2;
    const height = 12;
    const width = 12;
    const minimumHeight = 0;
    const minimumWidth = 4;
    expect(
      getTensorDimensions(
        row,
        col,
        patchSize,
        padding,
        scale,
        height,
        width,
        minimumHeight,
        minimumWidth,
      ),
    ).toEqual({
      origin: [0, 0, 7],
      size: [-1, 6, 5],
      sliceOrigin: [0, 0, 2],
      sliceSize: [-1, 10, 8],
    });
  });

  it('handles other scales', () => {
    const row = 1;
    const col = 1;
    const patchSize = 2;
    const padding = 0;
    const scale = 3;
    const height = 4;
    const width = 4;
    expect(
      getTensorDimensions(row, col, patchSize, padding, scale, height, width),
    ).toEqual({
      origin: [0, 2, 2],
      size: [-1, 2, 2],
      sliceOrigin: [0, 0, 0],
      sliceSize: [-1, 6, 6],
    });
  });

  it('handles other scales with padding', () => {
    const row = 1;
    const col = 1;
    const patchSize = 2;
    const padding = 1;
    const scale = 3;
    const height = 4;
    const width = 4;
    expect(
      getTensorDimensions(row, col, patchSize, padding, scale, height, width),
    ).toEqual({
      origin: [0, 1, 1],
      size: [-1, 3, 3],
      sliceOrigin: [0, 3, 3],
      sliceSize: [-1, 6, 6],
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
