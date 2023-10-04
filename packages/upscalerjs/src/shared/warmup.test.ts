import type { LayersModel } from '@tensorflow/tfjs-node';
import { vi } from 'vitest';
import * as tf from '@tensorflow/tfjs-node';
import { getInvalidValueError, cancellableWarmup, warmup, getSizesAsArray, isNumericWarmupSize, isWarmupSizeByPatchSize } from './warmup';
import { ModelPackage, NumericWarmupSizes, WarmupSizesByPatchSize } from './types';
import { 
  AbortError,
} from './errors-and-warnings';
import { PostProcess, PreProcess } from '@upscalerjs/core';

const getFakeModel = () => {
  const predict = vi.fn(() => {
    return {
      dataSync: () => {},
      dispose: () => {},
    };
  });

  return {
    predict,
  } as unknown as LayersModel;
};

describe('isNumericWarmupSize', () => {
  it('returns true for numeric warmup sizes', () => {
    expect(isNumericWarmupSize(1)).toBe(true);
  });

  it.each([
    [-1],
    ['foo'],
    [[1]],
    [[1,2,3]],
    [[1,'foo']],
    [['foo',1]],
  ])('returns false for non-numeric warmup sizes', (warmupSize) => {
    expect(isNumericWarmupSize(warmupSize)).toBe(false);
  });
});

describe('isWarmupSizeByPatchSize', () => {
  it('returns true for patchSize warmup sizes', () => {
    expect(isWarmupSizeByPatchSize({ patchSize: 32, })).toBe(true);
  });

  it.each([
    [1],
    ['foo'],
    [{ patchSize: 'foo' }],
    [[{ patchSize: 'foo' }]],
    [{ patchSize: [1,2] }],
  ])('returns false for non-patchSize warmup sizes', (warmupSize) => {
    expect(isWarmupSizeByPatchSize(warmupSize)).toBe(false);
  });
});

describe('cancellableWarmup', () => {
  test.each([
    // patch size warmup 
    [{ patchSize: 'foo' }], 
    // numeric warm up
    [-1],
    // array of patch size warmups
    [[{ patchSize: 'foo' }]], 
    [[{ patchSize: 32 }, { patchSize: 'foo' }, ]], 

    // array of numeric warmups
    [[-1]], 
    [['foo']], 
  ])(
    'throws if given invalid input of %p',
    async (args) => {
      const fakeModel = getFakeModel();
      const model = new Promise<ModelPackage>((resolve) =>
        resolve({
          model: fakeModel,
          modelDefinition: {
            modelType: 'layers',
            path: 'foo',
            scale: 2,
          },
        }),
      );
      await expect(cancellableWarmup(tf, model, args as any, undefined, {
        signal: new AbortController().signal,
      })).rejects.toThrow(
        getInvalidValueError(args)
      );
    },
  );

  it('does nothing if provided an empty array', async () => {
    const fakeModel = getFakeModel();
    const model = new Promise<ModelPackage>((resolve) =>
        resolve({
          model: fakeModel,
          modelDefinition: {
            modelType: 'layers',
            path: 'foo',
            scale: 2,
          },
        }),
    );
    await cancellableWarmup(tf, model, [], undefined, {
      signal: new AbortController().signal,
    });
    expect((await model).model.predict).not.toHaveBeenCalled();
  });

  describe('Numeric sizes', () => {
    it('predicts on a single item', async () => {
      const fakeModel = getFakeModel();
      const model = new Promise<ModelPackage>((resolve) =>
        resolve({
          model: fakeModel,
          modelDefinition: { 
            modelType: 'layers',
            path: 'foo', 
            scale: 2, 
          },
        }),
      );
      await cancellableWarmup(tf, model, [20,], undefined, {
        signal: new AbortController().signal,
      });
      expect((await model).model.predict).toHaveBeenCalledWith(
        expect.objectContaining({
          shape: [1, 20, 20, 3,],
        }),
      );
    });

    it('predicts on multiple items', async () => {
      const fakeModel = getFakeModel();
      const model = new Promise<ModelPackage>((resolve) =>
        resolve({
          model: fakeModel,
          modelDefinition: { 
            modelType: 'layers',
            path: 'foo', 
            scale: 2, 
          },
        }),
      );
      await cancellableWarmup(tf, model, [
        20,
        200,
      ], undefined, {
        signal: new AbortController().signal,
      });
      expect((await model).model.predict).toHaveBeenCalledWith(
        expect.objectContaining({
          shape: [1, 20, 20, 3,],
        }),
      );
      expect((await model).model.predict).toHaveBeenCalledWith(
        expect.objectContaining({
          shape: [1, 200, 200, 3,],
        }),
      );
    });
  });

  describe('Patch Sizes', () => {
    it('predicts on a single item', async () => {
      const fakeModel = getFakeModel();
      const model = new Promise<ModelPackage>((resolve) =>
        resolve({
          model: fakeModel,
          modelDefinition: { 
            path: 'foo', 
            scale: 2, 
            modelType: 'layers',
          },
        }),
      );
      await cancellableWarmup(tf, model, [{ patchSize: 10, },], undefined, {
        signal: new AbortController().signal,
      });
      expect((await model).model.predict).toHaveBeenCalledWith(
        expect.objectContaining({
          shape: [1, 10, 10, 3,],
        }),
      );
    });

    it('predicts on multiple items', async () => {
      const fakeModel = getFakeModel();
      const model = new Promise<ModelPackage>((resolve) =>
        resolve({
          model: fakeModel,
          modelDefinition: { 
            path: 'foo', 
            scale: 2, 
            modelType: 'layers',
          },
        }),
      );
      await cancellableWarmup(tf, model, [{ patchSize: 10, }, { patchSize: 20, },], undefined, {
        signal: new AbortController().signal,
      });
      expect((await model).model.predict).toHaveBeenCalledWith(
        expect.objectContaining({
          shape: [1, 10, 10, 3,],
        }),
      );
      expect((await model).model.predict).toHaveBeenCalledWith(
        expect.objectContaining({
          shape: [1, 20, 20, 3,],
        }),
      );
    });
  });

  describe('Cancelling', () => {
    it('is able to cancel an in-flight request', async () => {
      const controller = new AbortController();

      const predict = vi.fn(() => {
        controller.abort();
        return {
          dataSync: () => {},
          dispose: () => {},
        };
      });

      const fakeModel = {
        predict,
      } as unknown as LayersModel;
      const model = new Promise<ModelPackage>((resolve) =>
        resolve({
          model: fakeModel,
          modelDefinition: { 
            path: 'foo', 
            scale: 2, 
            modelType: 'layers',
          },
        }),
      );
      await expect(() => cancellableWarmup(tf, model, [{ patchSize: 10, }, { patchSize: 20, },], {
        signal: controller.signal,
        awaitNextFrame: true,
      }, {
        signal: new AbortController().signal,
      }))
        .rejects
        .toThrow(AbortError);
    });

    it('is able to cancel an in-flight request with an internal signal', async () => {
      const controller = new AbortController();

      const predict = vi.fn(() => {
        controller.abort();
        return {
          dataSync: () => {},
          dispose: () => {},
        };
      });

      const fakeModel = {
        predict,
      } as unknown as LayersModel;
      const model = new Promise<ModelPackage>((resolve) =>
        resolve({
          model: fakeModel,
          modelDefinition: { 
            path: 'foo', 
            scale: 2, 
            modelType: 'layers',
          },
        }),
      );
      await expect(() => cancellableWarmup(tf, model, [{ patchSize: 10, }, { patchSize: 20, },], {
        awaitNextFrame: true,
      }, {
        signal: controller.signal,
      }))
        .rejects
        .toThrow(AbortError);
    });
  });
});

describe('Warmup', () => {
  it('should clear up all memory while running without pre or post functions', async () => {
    const startingTensors = tf.memory().numTensors;
    const predict = vi.fn((tensor: tf.Tensor) => tensor.clone());

    const fakeModel = {
      predict,
    } as unknown as LayersModel;
    const modelPackage = new Promise<ModelPackage>((resolve) =>
      resolve({
        model: fakeModel,
        modelDefinition: { 
          path: 'foo', 
          scale: 2, 
          modelType: 'layers',
        },
      }),
    );
    const gen = warmup(tf, modelPackage, [{ patchSize: 10, },]);

    let currentExpectationIndex = 0;
    const expectations = [
      [1, '// initial dummy tensor // yield [dummyTensor,]; ',],
      [1, '// post predict // yield [dummyTensor,]; ',],
      [0, '// end of loop // yield; ',],
    ];
    let result = await gen.next();
    while (!result.done) {
      const [expectation, expectationKey] = expectations[currentExpectationIndex];
      const memory = tf.memory();
      const countedTensors = memory.numTensors - startingTensors
      try {
        expect(countedTensors).toEqual(expectation);
      } catch (err) {
        throw new Error(`Expected ${expectation}, received ${countedTensors} for ${expectationKey}`);
      }
      currentExpectationIndex++;
      result = await gen.next()
    }
    expect(currentExpectationIndex === expectations.length);

    expect(tf.memory().numTensors).toEqual(startingTensors);
  });

  it('should clear up all memory while running with a pre function', async () => {
    const startingTensors = tf.memory().numTensors;
    const predict = vi.fn((tensor: tf.Tensor) => tensor.clone());

    const fakeModel = {
      predict,
    } as unknown as LayersModel;
    const preprocess: PreProcess = (t: tf.Tensor) => t.clone() as tf.Tensor4D;
    const modelPackage = new Promise<ModelPackage>((resolve) =>
      resolve({
        model: fakeModel,
        modelDefinition: { 
          path: 'foo', 
          scale: 2, 
          preprocess, 
          modelType: 'layers',
        },
      }),
    );
    const gen = warmup(tf, modelPackage, [{ patchSize: 10, },]);

    let currentExpectationIndex = 0;
    const expectations = [
      [1, '// initial dummy tensor // yield [dummyTensor,]; ',],
      [1, '// pre process // yield [dummyTensor,]; ',],
      [1, '// post predict // yield [dummyTensor,]; ',],
      [0, '// end of loop // yield; ',],
    ];
    let result = await gen.next();
    while (!result.done) {
      const [expectation, expectationKey] = expectations[currentExpectationIndex];
      const memory = tf.memory();
      const countedTensors = memory.numTensors - startingTensors
      try {
        expect(countedTensors).toEqual(expectation);
      } catch (err) {
        throw new Error(`Expected ${expectation}, received ${countedTensors} for ${expectationKey}`);
      }
      currentExpectationIndex++;
      result = await gen.next()
    }
    expect(currentExpectationIndex === expectations.length);

    expect(tf.memory().numTensors).toEqual(startingTensors);
  });

  it('should clear up all memory while running with a post function', async () => {
    const startingTensors = tf.memory().numTensors;
    const predict = vi.fn((tensor: tf.Tensor) => tensor.clone());

    const fakeModel = {
      predict,
    } as unknown as LayersModel;
    const postprocess: PostProcess = (t: tf.Tensor) => t.clone() as tf.Tensor4D;
    const modelPackage = new Promise<ModelPackage>((resolve) =>
      resolve({
        model: fakeModel,
        modelDefinition: { 
          path: 'foo', 
          scale: 2, 
          postprocess, 
          modelType: 'layers',
        },
      }),
    );
    const gen = warmup(tf, modelPackage, [{ patchSize: 10, },]);

    let currentExpectationIndex = 0;
    const expectations = [
      [1, '// initial dummy tensor // yield [dummyTensor,]; ',],
      [1, '// post predict // yield [dummyTensor,]; ',],
      [1, '// postprocess // yield [dummyTensor,]; ',],
      [0, '// end of loop // yield; ',],
    ];
    let result = await gen.next();
    while (!result.done) {
      const [expectation, expectationKey] = expectations[currentExpectationIndex];
      const memory = tf.memory();
      const countedTensors = memory.numTensors - startingTensors
      try {
        expect(countedTensors).toEqual(expectation);
      } catch (err) {
        throw new Error(`Expected ${expectation}, received ${countedTensors} for ${expectationKey}`);
      }
      currentExpectationIndex++;
      result = await gen.next()
    }
    expect(currentExpectationIndex === expectations.length);

    expect(tf.memory().numTensors).toEqual(startingTensors);
  });

  it('should clear up all memory while running with a pre and post function', async () => {
    const startingTensors = tf.memory().numTensors;
    const predict = vi.fn((tensor: tf.Tensor) => tensor.clone());

    const fakeModel = {
      predict,
    } as unknown as LayersModel;
    const preprocess: PreProcess = (t: tf.Tensor) => t.clone() as tf.Tensor4D;
    const postprocess: PostProcess = (t: tf.Tensor) => t.clone() as tf.Tensor4D;
    const modelPackage = new Promise<ModelPackage>((resolve) =>
      resolve({
        model: fakeModel,
        modelDefinition: { 
          path: 'foo',
          scale: 2,
          preprocess,
          postprocess,
          modelType: 'layers',
        },
      }),
    );
    const gen = warmup(tf, modelPackage, [{ patchSize: 10, },]);

    let currentExpectationIndex = 0;
    const expectations = [
      [1, '// initial dummy tensor // yield [dummyTensor,]; ',],
      [1, '// preprocess // yield [dummyTensor,]; ',],
      [1, '// post predict // yield [dummyTensor,]; ',],
      [1, '// postprocess // yield [dummyTensor,]; ',],
      [0, '// end of loop // yield; ',],
    ];
    let result = await gen.next();
    while (!result.done) {
      const [expectation, expectationKey] = expectations[currentExpectationIndex];
      const memory = tf.memory();
      const countedTensors = memory.numTensors - startingTensors
      try {
        expect(countedTensors).toEqual(expectation);
      } catch (err) {
        throw new Error(`Expected ${expectation}, received ${countedTensors} for ${expectationKey}`);
      }
      currentExpectationIndex++;
      result = await gen.next()
    }
    expect(currentExpectationIndex === expectations.length);

    expect(tf.memory().numTensors).toEqual(startingTensors);
  });

  it('should clear up all memory while running with sizes of different formats', async () => {
    const startingTensors = tf.memory().numTensors;
    const predict = vi.fn((tensor: tf.Tensor) => tensor.clone());

    const fakeModel = {
      predict,
    } as unknown as LayersModel;
    const modelPackage = new Promise<ModelPackage>((resolve) =>
      resolve({
        model: fakeModel,
        modelDefinition: {
          path: 'foo',
          scale: 2,
          modelType: 'layers',
      },
      }),
    );
    const patchSizeWarmUp: WarmupSizesByPatchSize = { patchSize: 10, };
    const numericWarmUpSize: NumericWarmupSizes = 10;
    const gen = warmup(tf, modelPackage, [patchSizeWarmUp, numericWarmUpSize]);

    let currentExpectationIndex = 0;
    const expectations = [
      [1, '// initial dummy tensor // yield [dummyTensor,]; ',],
      [1, '// post predict // yield [dummyTensor,]; ',],
      [0, '// end of loop // yield; ',],
      [1, '// initial dummy tensor // yield [dummyTensor,]; ',],
      [1, '// post predict // yield [dummyTensor,]; ',],
      [0, '// end of loop // yield; ',],
    ];
    let result = await gen.next();
    while (!result.done) {
      const [expectation, expectationKey] = expectations[currentExpectationIndex];
      const memory = tf.memory();
      const countedTensors = memory.numTensors - startingTensors
      try {
        expect(countedTensors).toEqual(expectation);
      } catch (err) {
        throw new Error(`Expected ${expectation}, received ${countedTensors} for ${expectationKey}`);
      }
      currentExpectationIndex++;
      result = await gen.next()
    }
    expect(currentExpectationIndex === expectations.length);

    expect(tf.memory().numTensors).toEqual(startingTensors);
  });
});

describe('getSizesAsArray', () => {
  it('should return an array for a numeric size', () => {
    expect(getSizesAsArray(10)).toEqual([10]);
  });

  it('should return an array for a patchSize size', () => {
    expect(getSizesAsArray({ patchSize: 32, padding: 2 })).toEqual([{ patchSize: 32, padding: 2 }]);
  });

  it('should return an (unchanged) array for a numeric size array', () => {
    expect(getSizesAsArray([10])).toEqual([10]);
  });

  it('should return an (unchanged) array for a patchSize size array', () => {
    expect(getSizesAsArray([{ patchSize: 32, padding: 2 }])).toEqual([{ patchSize: 32, padding: 2 }]);
  });

  it.each([
    [-1],
    ['foo'],
    [[[1]]],
    [[[1,2,3]]],
    [[1,'foo']],
    [['foo',1]],
    [{ patchSize: 'foo' }],
    [[{ patchSize: 'foo' }]],
    [{ patchSize: [1,2] }],
  ])('should throw if given an invalid arg of %p', (warmupSize) => {
    expect(() => getSizesAsArray(warmupSize as any)).toThrow();
  });
})
