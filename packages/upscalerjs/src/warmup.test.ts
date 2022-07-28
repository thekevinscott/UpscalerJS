import type { LayersModel } from '@tensorflow/tfjs-node';
import { warmup } from './warmup';
import type { ModelDefinition, } from "@upscalerjs/core";

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

describe('Warmup', () => {
  it('throws if given an invalid size', async () => {
    const fakeModel = getFakeModel();
    const model = new Promise<{
      model: LayersModel;
      modelDefinition: ModelDefinition;
    }>((resolve) =>
      resolve({ model: fakeModel, modelDefinition: { path: 'foo', scale: 2, }, }),
    );
    await expect(warmup(model, [['foo', 1,],] as any)).rejects.toThrow(
      'Invalid value passed to warmup in warmupSizes. Expected two numbers, got foo,1',
    );
    await expect(warmup(model, [[1, 'foo',],] as any)).rejects.toThrow(
      'Invalid value passed to warmup in warmupSizes. Expected two numbers, got 1,foo',
    );
  });

  it('throws if given an invalid set of warmup sizes', () => {
    const fakeModel = getFakeModel();
    const model = new Promise<{
      model: LayersModel;
      modelDefinition: ModelDefinition;
    }>((resolve) =>
      resolve({ model: fakeModel, modelDefinition: { path: 'foo', scale: 2, }, }),
    );
    expect(warmup(model, [20, 20,] as any)).rejects.toEqual(expect.anything());
  });

  it('does nothing if provided an empty array', async () => {
    const fakeModel = getFakeModel();
    const model = new Promise<{
      model: LayersModel;
      modelDefinition: ModelDefinition;
    }>((resolve) =>
      resolve({ model: fakeModel, modelDefinition: { path: 'foo', scale: 2, }, }),
    );
    await warmup(model, []);
    expect((await model).model.predict).not.toHaveBeenCalled();
  });

  describe('Numeric sizes', () => {
    it('predicts on a single item', async () => {
      const fakeModel = getFakeModel();
      const model = new Promise<{
        model: LayersModel;
        modelDefinition: ModelDefinition;
      }>((resolve) =>
        resolve({
          model: fakeModel,
          modelDefinition: { path: 'foo', scale: 2, },
        }),
      );
      await warmup(model, [[20, 10,],]);
      expect((await model).model.predict).toHaveBeenCalledWith(
        expect.objectContaining({
          shape: [1, 10, 20, 3,],
        }),
      );
    });

    it('predicts on multiple items', async () => {
      const fakeModel = getFakeModel();
      const model = new Promise<{
        model: LayersModel;
        modelDefinition: ModelDefinition;
      }>((resolve) =>
        resolve({
          model: fakeModel,
          modelDefinition: { path: 'foo', scale: 2, },
        }),
      );
      await warmup(model, [
        [20, 10,],
        [200, 100,],
      ]);
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
      const model = new Promise<{
        model: LayersModel;
        modelDefinition: ModelDefinition;
      }>((resolve) =>
        resolve({
          model: fakeModel,
          modelDefinition: { path: 'foo', scale: 2, },
        }),
      );
      await warmup(model, [{ patchSize: 10, },]);
      expect((await model).model.predict).toHaveBeenCalledWith(
        expect.objectContaining({
          shape: [1, 10, 10, 3,],
        }),
      );
    });

    it('predicts on multiple items', async () => {
      const fakeModel = getFakeModel();
      const model = new Promise<{
        model: LayersModel;
        modelDefinition: ModelDefinition;
      }>((resolve) =>
        resolve({
          model: fakeModel,
          modelDefinition: { path: 'foo', scale: 2, },
        }),
      );
      await warmup(model, [{ patchSize: 10, }, { patchSize: 20, },]);
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
});
