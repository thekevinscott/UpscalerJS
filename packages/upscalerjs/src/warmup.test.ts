import type { LayersModel } from '@tensorflow/tfjs-node';
import * as tf from '@tensorflow/tfjs-node';
import { getInvalidValueError, cancellableWarmup, warmup } from './warmup';
import { ModelPackage } from './types';
import { AbortError } from './utils';

const getFakeModel = () => {
  const predict = jest.fn(() => {
    return {
      dataSync: () => {},
      dispose: () => {},
    };
  });

  return {
    predict,
  } as unknown as LayersModel;
};

describe('Cancellable Warmup', () => {
  it('throws if given an invalid size', async () => {
    const fakeModel = getFakeModel();
    const model = new Promise<ModelPackage>((resolve) =>
      resolve({ model: fakeModel, modelDefinition: { path: 'foo', scale: 2, }, }),
    );
    await expect(cancellableWarmup(model, [['foo', 1,],] as any, undefined, {
      signal: new AbortController().signal,
    })).rejects.toThrow(
      getInvalidValueError(['foo', 1])
    );
    await expect(cancellableWarmup(model, [[1, 'foo',],] as any, undefined, {
      signal: new AbortController().signal,
    })).rejects.toThrow(
      getInvalidValueError([1, 'foo'])
    );
  });

  it('throws if given an invalid set of warmup sizes', () => {
    const fakeModel = getFakeModel();
    const model = new Promise<ModelPackage>((resolve) =>
      resolve({ model: fakeModel, modelDefinition: { path: 'foo', scale: 2, }, }),
    );
    expect(cancellableWarmup(model, [20, 20,] as any, undefined, {
      signal: new AbortController().signal,
    })).rejects.toEqual(expect.anything());
  });

  it('does nothing if provided an empty array', async () => {
    const fakeModel = getFakeModel();
    const model = new Promise<ModelPackage>((resolve) =>
      resolve({ model: fakeModel, modelDefinition: { path: 'foo', scale: 2, }, }),
    );
    await cancellableWarmup(model, [], undefined, {
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
          modelDefinition: { path: 'foo', scale: 2, },
        }),
      );
      await cancellableWarmup(model, [[20, 10,],], undefined, {
        signal: new AbortController().signal,
      });
      expect((await model).model.predict).toHaveBeenCalledWith(
        expect.objectContaining({
          shape: [1, 10, 20, 3,],
        }),
      );
    });

    it('predicts on multiple items', async () => {
      const fakeModel = getFakeModel();
      const model = new Promise<ModelPackage>((resolve) =>
        resolve({
          model: fakeModel,
          modelDefinition: { path: 'foo', scale: 2, },
        }),
      );
      await cancellableWarmup(model, [
        [20, 10,],
        [200, 100,],
      ], undefined, {
        signal: new AbortController().signal,
      });
      expect((await model).model.predict).toHaveBeenCalledWith(
        expect.objectContaining({
          shape: [1, 10, 20, 3,],
        }),
      );
      expect((await model).model.predict).toHaveBeenCalledWith(
        expect.objectContaining({
          shape: [1, 100, 200, 3,],
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
          modelDefinition: { path: 'foo', scale: 2, },
        }),
      );
      await cancellableWarmup(model, [{ patchSize: 10, },], undefined, {
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
          modelDefinition: { path: 'foo', scale: 2, },
        }),
      );
      await cancellableWarmup(model, [{ patchSize: 10, }, { patchSize: 20, },], undefined, {
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

      const predict = jest.fn(() => {
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
          modelDefinition: { path: 'foo', scale: 2, },
        }),
      );
      await expect(() => cancellableWarmup(model, [{ patchSize: 10, }, { patchSize: 20, },], {
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

      const predict = jest.fn(() => {
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
          modelDefinition: { path: 'foo', scale: 2, },
        }),
      );
      await expect(() => cancellableWarmup(model, [{ patchSize: 10, }, { patchSize: 20, },], {
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
    const predict = jest.fn(() => {
      return {
        dataSync: () => {},
        dispose: () => {},
      };
    });

    const fakeModel = {
      predict,
    } as unknown as LayersModel;
    const modelPackage = new Promise<ModelPackage>((resolve) =>
      resolve({
        model: fakeModel,
        modelDefinition: { path: 'foo', scale: 2, },
      }),
    );
    const gen = warmup(modelPackage, [{ patchSize: 10, },]);

    let currentExpectationIndex = 0;
    const expectations = [
      [0, '// yield',],
    ];
    let result = await gen.next();
    while (!result.done) {
      const [expectation, expectationKey] = expectations[currentExpectationIndex];
      const memory = tf.memory();
      const countedTensors = memory.numTensors - startingTensors
      console.log('|', countedTensors, '|', expectation, '|', 'for', currentExpectationIndex, 'index', '|', result.value);
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
