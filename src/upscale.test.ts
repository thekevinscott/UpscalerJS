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
    scale: number;
  }
  interface IExpectation {
    row: number;
    col: number;
    expectation: {
      origin: [number, number];
      size: [number, number];
      sliceOrigin?: [number, number];
      sliceSize: [number, number];
    }
  }

  const testGetTensorDimensions = (opts: IOpts, expectations: Array<IExpectation>) => {
    for (let i = 0; i < expectations.length; i++) {
      const { row, col, expectation: {
        origin,
        size,
        sliceOrigin = [0, 0],
        sliceSize,
      } } = expectations[i];
      try {
        expect(
          getTensorDimensions(row, col, opts.patchSize, opts.padding, opts.scale, opts.height, opts.width),
        ).toEqual({
          origin: [0, ...origin],
          size: [-1, ...size],
          sliceOrigin: [0, ...sliceOrigin],
          sliceSize: [-1, ...sliceSize],
        });
      } catch (err) {
        err.message = `*******\n${row} | ${col}\n*******\n${err.message}`;
        throw err;
      }
    }
  }

  it('gets tensor dimensions for a fully-covered patch size', () => {
    testGetTensorDimensions({
      width: 2,
      height: 2,
      patchSize: 2,
      padding: 0,
      scale: 2,
    }, [{
      row: 0,
      col: 0,
      expectation: {
        origin: [0, 0],
        size: [2, 2],
        sliceSize: [4, 4],
      },
    }]);
  });

  it('gets tensor dimensions for a subset patch size that fits equally', () => {
    const sliceSize: [number, number] = [4, 4];
    const size: [number, number] = [2, 2];
    testGetTensorDimensions({
      width: 4,
      height: 4,
      patchSize: 2,
      padding: 0,
      scale: 2,
    }, [{
      row: 0,
      col: 0,
      expectation: {
        origin: [0, 0],
        size,
        sliceSize,
      },
    }, {
      row: 1,
      col: 0,
      expectation: {
        origin: [2, 0],
        size,
        sliceSize,
      },
    }, {
      row: 0,
      col: 1,
      expectation: {
        origin: [0, 2],
        size,
        sliceSize,
      },
    }, {
      row: 1,
      col: 1,
      expectation: {
        origin: [2, 2],
        size,
        sliceSize,
      },
    }]);
  });

  it('gets tensor dimensions for a subset patch size that is unequal', () => {
    testGetTensorDimensions({
      width: 6,
      height: 6,
      patchSize: 4,
      padding: 0,
      scale: 2,
    }, [{
      row: 0,
      col: 0,
      expectation: {
        origin: [0, 0],
        size: [4, 4],
        sliceSize: [8, 8],
      },
    }, {
      row: 1,
      col: 0,
      expectation: {
        origin: [4, 0],
        size: [2, 4],
        sliceSize: [4, 8],
      },
    }, {
      row: 0,
      col: 1,
      expectation: {
        origin: [0, 4],
        size: [4, 2],
        sliceSize: [8, 4],
      },
    }, {
      row: 1,
      col: 1,
      expectation: {
        origin: [4, 4],
        size: [2, 2],
        sliceSize: [4, 4],
      },
    }]);
  });

  it('gets tensor dimensions for an uneven subset patch size that fits equally', () => {
    const size: [number, number] = [2, 2]
    const sliceSize: [number, number] = [4, 4]
    testGetTensorDimensions({
      width: 6,
      height: 4,
      patchSize: 2,
      padding: 0,
      scale: 2,
    }, [{
      row: 0,
      col: 0,
      expectation: {
        origin: [0, 0],
        size,
        sliceSize,
      },
    }, {
      row: 1,
      col: 0,
      expectation: {
        origin: [2, 0],
        size,
        sliceSize,
      },
    }, {
      row: 0,
      col: 1,
      expectation: {
        origin: [0, 2],
        size,
        sliceSize,
      },
    }, {
      row: 1,
      col: 1,
      expectation: {
        origin: [2, 2],
        size,
        sliceSize,
      },
    }, {
      row: 0,
      col: 2,
      expectation: {
        origin: [0, 4],
        size,
        sliceSize,
      },
    }, {
      row: 1,
      col: 2,
      expectation: {
        origin: [2, 4],
        size,
        sliceSize,
      },
    }]);
  });

  it('gets tensor dimensions for an uneven subset patch size that fits unequally', () => {
    testGetTensorDimensions({
      width: 10,
      height: 5,
      patchSize: 4,
      padding: 0,
      scale: 2,
    }, [{
      row: 0,
      col: 0,
      expectation: {
        origin: [0, 0],
        size: [4, 4],
        sliceSize: [8, 8],
      },
    }, {
      row: 1,
      col: 0,
      expectation: {
        origin: [4, 0],
        size: [1, 4],
        sliceSize: [2, 8],
      },
    }, {
      row: 0,
      col: 1,
      expectation: {
        origin: [0, 4],
        size: [4, 4],
        sliceSize: [8, 8],
      },
    }, {
      row: 1,
      col: 1,
      expectation: {
        origin: [4, 4],
        size: [1, 4],
        sliceSize: [2, 8],
      },
    }, {
      row: 0,
      col: 2,
      expectation: {
        origin: [0, 8],
        size: [4, 2],
        sliceSize: [8, 4],
      },
    }, {
      row: 1,
      col: 2,
      expectation: {
        origin: [4, 8],
        size: [1, 2],
        sliceSize: [2, 4],
      },
    }]);
  });

  describe('Padding', () => {
    it('gets tensor dimensions for a fully-covered patch size with padding', () => {
      testGetTensorDimensions({
        width: 2,
        height: 2,
        patchSize: 2,
        padding: 1,
        scale: 2,
      }, [{
        row: 0,
        col: 0,
        expectation: {
          origin: [0, 0],
          size: [2, 2],
          sliceSize: [4, 4],
        },
      }]);
    });

    it('gets tensor dimensions for a subset patch size that fits equally with padding', () => {
      testGetTensorDimensions({
        width: 9,
        height: 9,
        patchSize: 3,
        padding: 1,
        scale: 2,
      }, [{
        row: 0,
        col: 0,
        expectation: {
          origin: [0, 0],
          size: [4, 4],
          sliceOrigin: [0, 0],
          sliceSize: [6, 6],
        },
      }, {
        row: 1,
        col: 0,
        expectation: {
          origin: [2, 0],
          size: [5, 4],
          sliceOrigin: [2, 0],
          sliceSize: [6, 6],
        },
      }, {
        row: 2,
        col: 0,
        expectation: {
          origin: [5, 0],
          size: [4, 4],
          sliceOrigin: [2, 0],
          sliceSize: [6, 6],
        },
      }, {
        row: 0,
        col: 1,
        expectation: {
          origin: [0, 2],
          size: [4, 5],
          sliceOrigin: [0, 2],
          sliceSize: [6, 6],
        },
      }, {
        row: 1,
        col: 1,
        expectation: {
          origin: [2, 2],
          size: [5, 5],
          sliceOrigin: [2, 2],
          sliceSize: [6, 6],
        },
      }, {
        row: 2,
        col: 1,
        expectation: {
          origin: [5, 2],
          size: [4, 5],
          sliceOrigin: [2, 2],
          sliceSize: [6, 6],
        },
      }, {
        row: 0,
        col: 2,
        expectation: {
          origin: [0, 5],
          size: [4, 4],
          sliceOrigin: [0, 2],
          sliceSize: [6, 6],
        },
      }, {
        row: 1,
        col: 2,
        expectation: {
          origin: [2, 5],
          size: [5, 4],
          sliceOrigin: [2, 2],
          sliceSize: [6, 6],
        },
      }, {
        row: 2,
        col: 2,
        expectation: {
          origin: [5, 5],
          size: [4, 4],
          sliceOrigin: [2, 2],
          sliceSize: [6, 6],
        },
      }]);
    });

  it('gets tensor dimensions for a subset patch size that is unequal with padding', () => {
    testGetTensorDimensions({
      width: 9,
      height: 9,
      patchSize: 4,
      padding: 1,
      scale: 2,
    }, [{
      row: 0,
      col: 0,
      expectation: {
        origin: [0, 3],
        size: [6, 5],
        sliceOrigin: [0, 2],
        sliceSize: [8, 8],
      },
    }, {
      row: 1,
      col: 0,
      expectation: {
        origin: [0, 0],
        size: [5, 5],
        sliceOrigin: [0, 0],
        sliceSize: [8, 8],
      },
    }]);
  });

  // it('gets tensor dimensions for an uneven subset patch size that fits equally', () => {
  //   const size: [number, number] = [2, 2]
  //   const sliceSize: [number, number] = [4, 4]
  //   testGetTensorDimensions({
  //     width: 6,
  //     height: 4,
  //     patchSize: 2,
  //     padding: 0,
  //     scale: 2,
  //   }, [{
  //     row: 0,
  //     col: 0,
  //     expectation: {
  //       origin: [0, 0],
  //       size,
  //       sliceSize,
  //     },
  //   }, {
  //     row: 1,
  //     col: 0,
  //     expectation: {
  //       origin: [2, 0],
  //       size,
  //       sliceSize,
  //     },
  //   }, {
  //     row: 0,
  //     col: 1,
  //     expectation: {
  //       origin: [0, 2],
  //       size,
  //       sliceSize,
  //     },
  //   }, {
  //     row: 1,
  //     col: 1,
  //     expectation: {
  //       origin: [2, 2],
  //       size,
  //       sliceSize,
  //     },
  //   }, {
  //     row: 0,
  //     col: 2,
  //     expectation: {
  //       origin: [0, 4],
  //       size,
  //       sliceSize,
  //     },
  //   }, {
  //     row: 1,
  //     col: 2,
  //     expectation: {
  //       origin: [2, 4],
  //       size,
  //       sliceSize,
  //     },
  //   }]);
  // });

  // it('gets tensor dimensions for an uneven subset patch size that fits unequally', () => {
  //   testGetTensorDimensions({
  //     width: 10,
  //     height: 5,
  //     patchSize: 4,
  //     padding: 0,
  //     scale: 2,
  //   }, [{
  //     row: 0,
  //     col: 0,
  //     expectation: {
  //       origin: [0, 0],
  //       size: [4, 4],
  //       sliceSize: [8, 8],
  //     },
  //   }, {
  //     row: 1,
  //     col: 0,
  //     expectation: {
  //       origin: [4, 0],
  //       size: [1, 4],
  //       sliceSize: [2, 8],
  //     },
  //   }, {
  //     row: 0,
  //     col: 1,
  //     expectation: {
  //       origin: [0, 4],
  //       size: [4, 4],
  //       sliceSize: [8, 8],
  //     },
  //   }, {
  //     row: 1,
  //     col: 1,
  //     expectation: {
  //       origin: [4, 4],
  //       size: [1, 4],
  //       sliceSize: [2, 8],
  //     },
  //   }, {
  //     row: 0,
  //     col: 2,
  //     expectation: {
  //       origin: [0, 8],
  //       size: [4, 2],
  //       sliceSize: [8, 4],
  //     },
  //   }, {
  //     row: 1,
  //     col: 2,
  //     expectation: {
  //       origin: [4, 8],
  //       size: [1, 2],
  //       sliceSize: [2, 4],
  //     },
  //   }]);
  // });
  });

  // it('handles other scales', () => {
  //   const row = 1;
  //   const col = 1;
  //   const patchSize = 2;
  //   const padding = 0;
  //   const scale = 3;
  //   const height = 4;
  //   const width = 4;
  //   expect(
  //     getTensorDimensions(row, col, patchSize, padding, scale, height, width),
  //   ).toEqual({
  //     origin: [0, 2, 2],
  //     size: [-1, 2, 2],
  //     sliceOrigin: [0, 0, 0],
  //     sliceSize: [-1, 6, 6],
  //   });
  // });

  // it('handles other scales with padding', () => {
  //   const row = 1;
  //   const col = 1;
  //   const patchSize = 2;
  //   const padding = 1;
  //   const scale = 3;
  //   const height = 4;
  //   const width = 4;
  //   expect(
  //     getTensorDimensions(row, col, patchSize, padding, scale, height, width),
  //   ).toEqual({
  //     origin: [0, 1, 1],
  //     size: [-1, 3, 3],
  //     sliceOrigin: [0, 3, 3],
  //     sliceSize: [-1, 6, 6],
  //   });
  // });
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
