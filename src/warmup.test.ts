import * as tf from '@tensorflow/tfjs';
import warmup from './warmup';
import { IModelDefinition } from './types';

const getFakeModel = () => {
  const predict = jest.fn(async () => {
    return {
      dataSync: () => {},
      dispose: () => {},
    };
  });

  return ({
    predict,
  } as unknown) as tf.LayersModel;
};

describe('Warmup', () => {
  it('does nothing if provided an empty array', async () => {
    const fakeModel = getFakeModel();
    const model = new Promise<{
      model: tf.LayersModel;
      modelDefinition: IModelDefinition;
    }>((resolve) =>
      resolve({ model: fakeModel, modelDefinition: { url: 'foo', scale: 2 } }),
    );
    await warmup(model, []);
    expect((await model).model.predict).not.toHaveBeenCalled();
  });

  it('predicts on a single item', async () => {
    const fakeModel = getFakeModel();
    const model = new Promise<{
      model: tf.LayersModel;
      modelDefinition: IModelDefinition;
    }>((resolve) =>
      resolve({ model: fakeModel, modelDefinition: { url: 'foo', scale: 2 } }),
    );
    await warmup(model, [[20, 10]]);
    expect((await model).model.predict).toHaveBeenCalledWith(
      expect.objectContaining({
        shape: [1, 10, 20, 3],
      }),
    );
  });

  it('predicts on multiple items', async () => {
    const fakeModel = getFakeModel();
    const model = new Promise<{
      model: tf.LayersModel;
      modelDefinition: IModelDefinition;
    }>((resolve) =>
      resolve({ model: fakeModel, modelDefinition: { url: 'foo', scale: 2 } }),
    );
    await warmup(model, [
      [20, 10],
      [200, 100],
    ]);
    expect((await model).model.predict).toHaveBeenCalledWith(
      expect.objectContaining({
        shape: [1, 10, 20, 3],
      }),
    );
    expect((await model).model.predict).toHaveBeenCalledWith(
      expect.objectContaining({
        shape: [1, 100, 200, 3],
      }),
    );
  });

  it('throws if given an invalid set of warmup sizes', () => {
    const fakeModel = getFakeModel();
    const model = new Promise<{
      model: tf.LayersModel;
      modelDefinition: IModelDefinition;
    }>((resolve) =>
      resolve({ model: fakeModel, modelDefinition: { url: 'foo', scale: 2 } }),
    );
    expect(() => warmup(model, [20, 20] as any)).toThrow();
  });
});
