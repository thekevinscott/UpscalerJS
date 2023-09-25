import * as tf from '@tensorflow/tfjs-node';
import {
  getPercentageComplete,
  processPixels,
  upscale,
  cancellableUpscale,
  executeModel,
} from './upscale';
import {
  WARNING_PROGRESS_WITHOUT_PATCH_SIZE,
  ERROR_INVALID_MODEL_PREDICTION,
  ERROR_INVALID_TENSOR_PREDICTED,
  AbortError,
} from './errors-and-warnings';
import {
  checkValidEnvironment as _checkValidEnvironment,
  tensorAsBase64 as _tensorAsBase64,
  getImageAsTensor as _getImageAsTensor,
} from './image.generated';
import {
  wrapGenerator,
  warn as _warn,
} from './utils';
import {
  ModelDefinition,
  isFourDimensionalTensor as _isFourDimensionalTensor,
  isTensor as _isTensor,
} from '@upscalerjs/core';
import { ModelPackage, MultiArgStringProgress, } from './types';
import { mockFn } from '../../../test/lib/shared/mockers.cjs';

jest.mock('./utils', () => {
  const { warn, ...rest } = jest.requireActual('./utils');
  return {
    ...rest,
    warn: jest.fn(warn),
  };
});

jest.mock('./image.generated', () => {
  const { tensorAsBase64, getImageAsTensor, checkValidEnvironment, ...rest } = jest.requireActual('./image.generated');
  return {
    ...rest,
    tensorAsBase64: jest.fn(tensorAsBase64),
    getImageAsTensor: jest.fn(getImageAsTensor),
    checkValidEnvironment: jest.fn(checkValidEnvironment),
  };
});
jest.mock('@upscalerjs/core', () => {
  const { isFourDimensionalTensor, isTensor, ...rest } = jest.requireActual('@upscalerjs/core');
  return {
    ...rest,
    isTensor: jest.fn(isTensor),
    isFourDimensionalTensor: jest.fn(isFourDimensionalTensor),
  };
});

// jest.mock('./tensor-utils', () => {
//   const { getWidthAndHeight, ...rest } = jest.requireActual('./tensor-utils');
//   return {
//     ...rest,
//     getWidthAndHeight: jest.fn(getWidthAndHeight),
//   };
// });

const tensorAsBase64 = mockFn(_tensorAsBase64);
const getImageAsTensor = mockFn(_getImageAsTensor);
const isTensor = mockFn(_isTensor);
const isFourDimensionalTensor = mockFn(_isFourDimensionalTensor);
const checkValidEnvironment = mockFn(_checkValidEnvironment);
const warn = mockFn(_warn);

describe('getPercentageComplete', () => {
  it.each([
    [0.25, 0, 0, 2, 2],
    [0.5, 0, 1, 2, 2],
    [0.75, 1, 0, 2, 2],
    [1.0, 1, 1, 2, 2],

    [0.125, 0, 0, 2, 4],
    [0.25, 0, 1, 2, 4],
    [0.375, 1, 0, 2, 4],
    [0.5, 1, 1, 2, 4],
    [0.625, 2, 0, 2, 4],
    [0.75, 2, 1, 2, 4],
    [0.875, 3, 0, 2, 4],
    [1.0, 3, 1, 2, 4],

    [0.125, 0, 0, 4, 2],
    [0.25, 0, 1, 4, 2],
    [0.375, 0, 2, 4, 2],
    [0.5, 0, 3, 4, 2],
    [0.625, 1, 0, 4, 2],
    [0.75, 1, 1, 4, 2],
    [0.875, 1, 2, 4, 2],
    [1.0, 1, 3, 4, 2],

    [0.005263157895, 0, 0, 19, 10],
  ])('gets the percentage %f for row %i, col %i, columns %i and rows %i', (expected, row, col, columns, rows) => {
    const total = rows * columns;
    const percent = getPercentageComplete(row, col, columns, total);
    expect(percent.toFixed(4)).toBe(expected.toFixed(4));
  });
});

describe('predict', () => {
  const modelDefinition: ModelDefinition = { scale: 2, path: 'foo', modelType: 'layers', };

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

  beforeEach(() => {
    warn.mockImplementation(() => {});
  });

  afterEach(() => {
    warn.mockClear();
    if (tensor !== undefined) {
      tensor.dispose();
    }
  });

  const getWidthAndHeightOfImg = (img: tf.Tensor3D | tf.Tensor4D) => {
    if (img.shape.length === 4) {
      return [img.shape[1], img.shape[2]];
    }
    return [img.shape[0], img.shape[1]];
  };

  const checkStartingTensorAgainstUpscaledTensor = (img?: tf.Tensor3D | tf.Tensor4D, result?: tf.Tensor3D | tf.Tensor4D, scale = SCALE) => tf.tidy(() => {
    if (!img) {
      throw new Error('No starting tensor provided.')
    }
    const [height, width] = getWidthAndHeightOfImg(img);
    const resizedOriginal = tf.image.resizeNearestNeighbor(img, [height * scale, width * scale]).expandDims(0);
    expect(resizedOriginal.dataSync()).toEqual(result?.dataSync());
  });

  const getTensorRange = (width: number, height: number): tf.Tensor1D => tf.tidy(() => tf.range(1, 1 + (width * height), 1));

  const getTensor = (height: number, width: number): tf.Tensor3D => tf.tidy(() => getTensorRange(width, height).reshape([height, width, 1]).tile([1, 1, 3]));

  it('should make a prediction', async () => {
    const spy = jest.spyOn(model, 'predict');
    tensor = getTensor(2, 2);
    const result = await wrapGenerator(processPixels(
      tensor.expandDims(0),
      {
        output: 'base64',
        progressOutput: 'base64',
      },
      modelPackage,
      {
        originalImageSize: [null, ...tensor.shape],
      })
    );
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        shape: [1, 2, 2, 3,],
      }),
    );
    checkStartingTensorAgainstUpscaledTensor(tensor, result);
  });

  it('should make a prediction with a patchSize', async () => {
    tensor = getTensor(2, 2);
    const result = await wrapGenerator(processPixels(
      tensor.expandDims(0),
      {
        output: 'base64',
        progressOutput: 'base64',
      },
      modelPackage,
      {
        originalImageSize: [null, ...tensor.shape],
        patchSize: 1,
        padding: 0,
      }
    ));
    checkStartingTensorAgainstUpscaledTensor(tensor, result);
  });

  it('should make a prediction with a patchSize and a tall image', async () => {
    const tensor = getTensor(4, 2);
    const result = await wrapGenerator(processPixels(
      tensor.expandDims(0),
      {
        output: 'base64',
        progressOutput: 'base64',
      },
      modelPackage,
      {
        originalImageSize: [null, ...tensor.shape],
        patchSize: 1,
        padding: 0,
      }
    ));
    checkStartingTensorAgainstUpscaledTensor(tensor, result);
  });

  it('should callback with progress on patchSize', async () => {
    tensor = getTensor(4, 4).expandDims(0) as tf.Tensor4D;
    const patchSize = 2;
    const progress = jest.fn();
    await wrapGenerator(
      processPixels(tensor, {
        progress,
        output: 'base64',
        progressOutput: 'base64',
      },
        modelPackage,
        {
          originalImageSize: tensor.shape,
          patchSize,
          padding: 0,
        })
    );
    expect(progress).toHaveBeenCalledWith(0.25);
    expect(progress).toHaveBeenCalledWith(0.5);
    expect(progress).toHaveBeenCalledWith(0.75);
    expect(progress).toHaveBeenCalledWith(1);
    expect(warn).not.toHaveBeenCalled();
  });

  it('should invoke progress callback with percent and slice', async () => {
    const mockResponse = 'foobarbaz1';
    tensorAsBase64.mockImplementation(() => mockResponse);
    const tensor = getTensor(4, 4).expandDims(0) as tf.Tensor4D;
    const patchSize = 2;
    const progress = jest.fn((_1: any, _2: any) => { });
    await wrapGenerator(processPixels(
      tensor, {
      progress,
      output: 'base64',
      progressOutput: 'base64',
    },
      modelPackage,
      {
        originalImageSize: tensor.shape,
        patchSize,
        padding: 0,
      })
    );
    expect(progress).toHaveBeenCalledWith(0.25, mockResponse, expect.objectContaining({ row: 0, col: 0, }));
    expect(progress).toHaveBeenCalledWith(0.5, mockResponse, expect.objectContaining({ row: 0, col: 1, }));
    expect(progress).toHaveBeenCalledWith(0.75, mockResponse, expect.objectContaining({ row: 1, col: 0, }));
    expect(progress).toHaveBeenCalledWith(1, mockResponse, expect.objectContaining({ row: 1, col: 1, }));
    expect(warn).not.toHaveBeenCalled();
  });

  it('should invoke progress callback with percent and a rescaled slice if given an output range', async () => {
    const mockResponse = 'foobarbaz1';
    tensorAsBase64.mockImplementation(() => mockResponse);
    const tensor = getTensor(4, 4).expandDims(0) as tf.Tensor4D;
    const patchSize = 2;
    const progress = jest.fn((_1: any, _2: any) => { });
    await wrapGenerator(processPixels(
      tensor,
      {
        progress,
        output: 'base64',
        progressOutput: 'base64',
      }, {
      ...modelPackage,
      modelDefinition: {
        ...modelPackage.modelDefinition,
        outputRange: [0, 1],
      },
    }, {
      patchSize,
      padding: 0,
      originalImageSize: tensor.shape,
    })
    );
    expect(progress).toHaveBeenCalledWith(0.25, mockResponse, expect.objectContaining({ row: 0, col: 0, }));
    expect(progress).toHaveBeenCalledWith(0.5, mockResponse, expect.objectContaining({ row: 0, col: 1, }));
    expect(progress).toHaveBeenCalledWith(0.75, mockResponse, expect.objectContaining({ row: 1, col: 0, }));
    expect(progress).toHaveBeenCalledWith(1, mockResponse, expect.objectContaining({ row: 1, col: 1, }));
    expect(warn).not.toHaveBeenCalled();
  });

  it('should invoke progress callback with percent, slice, and slice data', async () => {
    const mockResponse = 'foobarbaz1';
    tensorAsBase64.mockImplementation(() => mockResponse);
    const tensor = getTensor(4, 4).expandDims(0) as tf.Tensor4D;
    const patchSize = 2;
    const progress = jest.fn<ReturnType<MultiArgStringProgress>, Parameters<MultiArgStringProgress>>((_1: any, _2: any, _3: any) => { });
    await wrapGenerator(processPixels(
      tensor, {
      progress,
      output: 'base64',
      progressOutput: 'base64',
    },
      modelPackage,
      {
        patchSize,
        padding: 0,
        originalImageSize: tensor.shape,
      })
    );
    expect(progress).toHaveBeenCalledWith(0.25, mockResponse, expect.objectContaining({ row: 0, col: 0, }));
    expect(progress).toHaveBeenCalledWith(0.5, mockResponse, expect.objectContaining({ row: 0, col: 1, }));
    expect(progress).toHaveBeenCalledWith(0.75, mockResponse, expect.objectContaining({ row: 1, col: 0, }));
    expect(progress).toHaveBeenCalledWith(1, mockResponse, expect.objectContaining({ row: 1, col: 1, }));
    expect(warn).not.toHaveBeenCalled();
  });

  it('should invoke progress callback with slice as tensor, if output is a tensor, for a tall image', async () => {
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
    });
    await wrapGenerator(processPixels(
      tensor,
      {
        progress,
        output: 'tensor',
        progressOutput: 'tensor',
      },
      modelPackage,
      {
        originalImageSize: tensor.shape,
        patchSize,
        padding: 0,
      })
    );
    expect(progress).toHaveBeenCalledWith(0.5,
      expect.objectContaining({
        shape: [4, 4, 3,],
      }),
      expect.objectContaining({
        row: expect.any(Number),
        col: expect.any(Number),
      }),
    );
    expect(progress).toHaveBeenCalledWith(1,
      expect.objectContaining({
        shape: [4, 4, 3,],
      }),
      expect.objectContaining({
        row: expect.any(Number),
        col: expect.any(Number),
      }),
    );
    expect(warn).not.toHaveBeenCalled();
  });

  it('should invoke progress callback with slice as tensor, if output is a tensor, for a wide image', async () => {
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
    });
    await wrapGenerator(processPixels(
      tensor,
      {
        progress,
        output: 'tensor',
        progressOutput: 'tensor',
      },
      modelPackage,
      {
        originalImageSize: tensor.shape,
        patchSize,
        padding: 0,
      })
    );
    expect(progress).toHaveBeenCalledWith(0.5,
      expect.objectContaining({
        shape: [4, 4, 3,],
      }),
      expect.objectContaining({
        row: expect.any(Number),
        col: expect.any(Number),
      }),
    );
    expect(progress).toHaveBeenCalledWith(1,
      expect.objectContaining({
        shape: [4, 4, 3,],
      }),
      expect.objectContaining({
        row: expect.any(Number),
        col: expect.any(Number),
      }),
    );
    expect(warn).not.toHaveBeenCalled();
  });

  it('should invoke progress callback with slice as tensor, if output is a string but progressOutput is tensor', async () => {
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
    });
    await wrapGenerator(processPixels(
      tensor,
      {
        progress,
        output: 'base64',
        progressOutput: 'tensor',
      },
      modelPackage,
      {
        originalImageSize: tensor.shape,
        patchSize,
        padding: 0,
      })
    );
    expect(progress).toHaveBeenCalledWith(0.5,
      expect.objectContaining({
        shape: [4, 4, 3,],
      }),
      expect.objectContaining({
        row: expect.any(Number),
        col: expect.any(Number),
      }),
    );
    expect(progress).toHaveBeenCalledWith(1,
      expect.objectContaining({
        shape: [4, 4, 3,],
      }),
      expect.objectContaining({
        row: expect.any(Number),
        col: expect.any(Number),
      }),
    );
    expect(warn).not.toHaveBeenCalled();
  });

  it('should warn if provided a progress callback without patchSize', async () => {
    tensor = getTensor(4, 4).expandDims(0) as tf.Tensor4D;
    await wrapGenerator(processPixels(
      tensor,
      {
        output: 'base64',
        progressOutput: 'base64',
        progress: () => { },
      },
      modelPackage,
      {
        originalImageSize: tensor.shape,
      })
    );
    expect(warn).toHaveBeenCalledWith(WARNING_PROGRESS_WITHOUT_PATCH_SIZE);
  });

  describe('memory cleanup in predict', () => {
    it('should clear up all memory while running predict without patch size', async () => {
      const IMG_SIZE = 2;
      tensor = getTensor(IMG_SIZE, IMG_SIZE).expandDims(0) as tf.Tensor4D;
      const startingTensors = tf.memory().numTensors;
      const gen = processPixels(tensor, {
        output: 'base64',
        progressOutput: 'base64',
      }, modelPackage, {
        originalImageSize: tensor.shape,
      });


      let currentExpectationIndex = 0;
      const expectations = [
        1, //   yield [prediction,];
        1, //   yield [postprocessedTensor,];
      ];
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
      expect(result.done).toEqual(true);
      expect(Array.isArray(result.value)).toEqual(false);
      tf.tidy(() => checkStartingTensorAgainstUpscaledTensor(tensor, result.value as tf.Tensor4D));
      (result.value as tf.Tensor).dispose();
      expect(currentExpectationIndex === expectations.length);

      expect(tf.memory().numTensors).toEqual(startingTensors);
    });

    it('should clear up all memory while running predict with patch size', async () => {
      const IMG_SIZE = 4;
      tensor = getTensor(IMG_SIZE, IMG_SIZE).expandDims(0) as tf.Tensor4D;
      const startingTensors = tf.memory().numTensors;
      const patchSize = 2;
      const gen = processPixels(
        tensor,
        {
          output: 'base64',
          progressOutput: 'base64',
        },
        modelPackage,
        {
          originalImageSize: tensor.shape,
          patchSize,
        }
      );

      let currentExpectationIndex = 0;
      const expectations = [
        [0, '// yield',],

        [0, '// row loop 0 // yield',],

        [0, '// row loop 0, col loop 0 // 0 transitory tensors, 0 col tensor // yield [colTensor, upscaledTensor,]; ',],
        [1, '// row loop 0, col loop 0 // 1 transitory tensor // yield [upscaledTensor, colTensor, slicedPixels,];',],
        [1, '// row loop 0, col loop 0 // 1 transitory tensor // yield [upscaledTensor, colTensor, prediction,];',],
        [1, '// row loop 0, col loop 0 // 1 transitory tensor // yield [upscaledTensor, colTensor, processedPrediction,];',],
        [1, '// row loop 0, col loop 0 // 1 transitory tensor // yield [upscaledTensor, colTensor, slicedPrediction,];',],
        [1, '// row loop 0, col loop 0 // 1 transitory tensor // yield [upscaledTensor, colTensor, slicedPrediction,];',],
        [1, '// row loop 0, col loop 0 // 0 transitory tensors, 1 col tensor // yield [upscaledTensor, colTensor,];',],

        [1, '// row loop 0, col loop 1 // 0 transitory tensors, 1 col tensor // yield [upscaledTensor, colTensor,];',],
        [2, '// row loop 0, col loop 1 // 1 transitory tensor, 1 col tensor // yield [upscaledTensor, colTensor, slicedPixels,];',],
        [2, '// row loop 0, col loop 1 // 1 transitory tensor, 1 col tensor // yield [upscaledTensor, colTensor, prediction,];',],
        [2, '// row loop 0, col loop 1 // 1 transitory tensor, 1 col tensor // yield [upscaledTensor, colTensor, processedPrediction,];',],
        [2, '// row loop 0, col loop 1 // 1 transitory tensor, 1 col tensor // yield [upscaledTensor, colTensor, slicedPrediction,];',],
        [2, '// row loop 0, col loop 1 // 1 transitory tensor, 1 col tensor // yield [upscaledTensor, colTensor, slicedPrediction,];',],
        [1, '// row loop 0, col loop 1 // 0 transitory tensors, 1 col tensor // yield [upscaledTensor, colTensor,];',],

        [1, '// row loop 0 end // 0 transitory tensors, 0 col tensor, 1 row tensor // yield [upscaledTensor,];',],

        [1, '// row loop 1 // yield [colTensor, upscaledTensor,];',],

        [1, '// row loop 1, col loop 1 // 0 transitory tensors, 0 col tensor, 1 row tensor // yield [upscaledTensor, colTensor,];',],
        [2, '// row loop 1, col loop 1 // 1 transitory tensor, 0 col tensor, 1 row tensor // yield [upscaledTensor, colTensor, slicedPixels,];',],
        [2, '// row loop 1, col loop 1 // 1 transitory tensor, 0 col tensor, 1 row tensor // yield [upscaledTensor, colTensor, prediction,];',],
        [2, '// row loop 1, col loop 1 // 1 transitory tensor, 0 col tensor, 1 row tensor // yield [upscaledTensor, colTensor, processedPrediction,];',],
        [2, '// row loop 1, col loop 1 // 1 transitory tensor, 0 col tensor, 1 row tensor // yield [upscaledTensor, colTensor, slicedPrediction,];',],
        [2, '// row loop 1, col loop 1 // 1 transitory tensor, 0 col tensor, 1 row tensor // yield [upscaledTensor, colTensor, slicedPrediction,];',],
        [2, '// row loop 1, col loop 1 // 0 transitory tensors, 1 col tensor, 1 row tensor // yield [upscaledTensor, colTensor,];',],

        [2, '// row loop 1, col loop 1 // 0 transitory tensor, 1 col tensor, 1 row tensor // yield [upscaledTensor, colTensor,];',],
        [3, '// row loop 1, col loop 1 // 1 transitory tensor, 1 col tensor, 1 row tensor // yield [upscaledTensor, colTensor, slicedPixels,];',],
        [3, '// row loop 1, col loop 1 // 1 transitory tensor, 1 col tensor, 1 row tensor // yield [upscaledTensor, colTensor, prediction,];',],
        [3, '// row loop 1, col loop 1 // 1 transitory tensor, 1 col tensor, 1 row tensor // yield [upscaledTensor, colTensor, processedPrediction,];',],
        [3, '// row loop 1, col loop 1 // 1 transitory tensor, 1 col tensor, 1 row tensor // yield [upscaledTensor, colTensor, slicedPrediction,];',],
        [3, '// row loop 1, col loop 1 // 1 transitory tensor, 1 col tensor, 1 row tensor // yield [upscaledTensor, colTensor, slicedPrediction,];',],
        [2, '// row loop 1, col loop 1 // 0 transitory tensors, 1 col tensor, 1 row tensor // yield [upscaledTensor, colTensor,];',],

        [1, '// 0 transitory tensors, 0 col tensor, 1 tensor // yield [upscaledTensor,];',],
        [1, '// 0 transitory tensors, 0 col tensor, 1 tensor // yield [processedUpscaledTensor,];',],
      ];
      let result = await gen.next();
      while (!result.done) {
        const [expectation, expectationKey] = expectations[currentExpectationIndex];
        const memory = tf.memory();
        const countedTensors = memory.numTensors - startingTensors
        // console.log('|', countedTensors, '|', expectation, '|', 'for', currentExpectationIndex, 'index', '|', result.value);
        try {
          expect(countedTensors).toEqual(expectation);
        } catch (err) {
          throw new Error(`Expected ${expectation}, received ${countedTensors} for ${expectationKey}`);
        }
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
  afterEach(() => {
    getImageAsTensor.mockClear();
    tensorAsBase64.mockClear();
  });

  it('should return a base64 string by default', async () => {
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
      inputs: [{
        shape: [null, null, null, 3],
      }]
    } as unknown as tf.LayersModel;
    tensorAsBase64.mockImplementation(() => 'foobarbaz4');
    const result = await wrapGenerator(upscale(img, {
      output: 'base64',
      progressOutput: 'base64',
    }, {
      model,
      modelDefinition: { scale: 2, } as ModelDefinition,
    }));
    expect(result).toEqual('foobarbaz4');
    expect(tensorAsBase64).toHaveBeenCalled();
  });

  it('should return a base64 string that has been rescaled if given an output range', async () => {
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
      inputs: [{
        shape: [null, null, null, 3],
      }]
    } as unknown as tf.LayersModel;
    tensorAsBase64.mockImplementation(() => 'foobarbaz4');
    const result = await wrapGenerator(upscale(img, {
      output: 'base64',
      progressOutput: 'base64',
    }, {
      model,
      modelDefinition: {
        scale: 2,
        outputRange: [0, 1],
      } as ModelDefinition,
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
      predict: jest.fn(() => upscaledTensor.clone()),
      inputs: [{
        shape: [null, null, null, 3],
      }]
    } as unknown as tf.LayersModel;
    // (mockedTensorAsBase as any).default = async() => 'foobarbaz5';
    const result = await wrapGenerator(upscale(img, { output: 'tensor', progressOutput: 'tensor', }, {
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
  beforeEach(() => {
    checkValidEnvironment.mockImplementation(() => true);
  });

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
      inputs: [{
        shape: [null, null, null, 3],
      }]
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
      output: 'base64',
      progressOutput: 'base64',
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
      inputs: [{
        shape: [null, null, null, 3],
      }]
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
      output: 'base64',
      progressOutput: 'base64',
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
    checkValidEnvironment.mockImplementation(() => true);
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
      inputs: [{
        shape: [null, null, null, 3],
      }]
    } as unknown as tf.LayersModel;
    const result = await cancellableUpscale(img, {
      patchSize,
      padding: 0,
      output: 'base64',
      progressOutput: 'base64',
    }, {
      model,
      modelDefinition: { scale, } as ModelDefinition,
      signal: controller.signal,
    });
    expect(result).toEqual(mockResponse);
  });
});

describe('executeModel', () => {
  afterEach(() => {
    isTensor.mockClear();
    isFourDimensionalTensor.mockClear();
  });
  it('throws if the model does not return a valid tensor', () => {
    const model = {
      predict: () => 'foo',
      inputs: [{
        shape: [null, null, null, 3],
      }]
    } as any as tf.LayersModel;
    isTensor.mockImplementation(() => false);
    expect(() => executeModel(model, 'foo' as any as tf.Tensor4D)).toThrow(ERROR_INVALID_MODEL_PREDICTION);
  });

  it('throws if the model does not return a valid rank 4 tensor', () => {
    const tensor = {
      shape: [1, 1, 1],
    } as any as tf.Tensor3D;
    const model = {
      predict: () => tensor,
      inputs: [{
        shape: [null, null, null, 3],
      }]
    } as any as tf.LayersModel;
    isTensor.mockImplementation(() => true);
    isFourDimensionalTensor.mockImplementation(() => false);
    expect(() => executeModel(model, 'foo' as any as tf.Tensor4D)).toThrow(ERROR_INVALID_TENSOR_PREDICTED(tensor.shape));
  });

  it('returns a valid 4d tensor', () => {
    const tensor = {
      shape: [1, 1, 1, 1],
    } as any as tf.Tensor4D;
    const model = {
      predict: () => tensor,
      inputs: [{
        shape: [null, null, null, 3],
      }]
    } as any as tf.LayersModel;
    isTensor.mockImplementation(() => true);
    isFourDimensionalTensor.mockImplementation(() => true);
    expect(executeModel(model, 'foo' as any as tf.Tensor4D)).toEqual(tensor);
  });
});
