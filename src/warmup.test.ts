import * as tf from '@tensorflow/tfjs';
import warmup from './warmup';

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
    const model = new Promise<tf.LayersModel>((resolve) => resolve(fakeModel));
    await warmup(model, []);
    expect((await model).predict).not.toHaveBeenCalled();
  });

  it('predicts on a single item', async () => {
    const fakeModel = getFakeModel();
    const model = new Promise<tf.LayersModel>((resolve) => resolve(fakeModel));
    await warmup(model, [[20, 10]]);
    expect((await model).predict).toHaveBeenCalledWith(
      expect.objectContaining({
        shape: [1, 10, 20, 3],
      }),
    );
  });

  it('predicts on multiple items', async () => {
    const fakeModel = getFakeModel();
    const model = new Promise<tf.LayersModel>((resolve) => resolve(fakeModel));
    await warmup(model, [
      [20, 10],
      [200, 100],
    ]);
    expect((await model).predict).toHaveBeenCalledWith(
      expect.objectContaining({
        shape: [1, 10, 20, 3],
      }),
    );
    expect((await model).predict).toHaveBeenCalledWith(
      expect.objectContaining({
        shape: [1, 100, 200, 3],
      }),
    );
  });
});
