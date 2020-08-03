import loadModel, { getModelPath } from './loadModel';
import * as models from './models';
import * as tf from '@tensorflow/tfjs';
jest.mock('./models');
jest.mock('@tensorflow/tfjs');

const mockModels = (obj: { [index: string]: any }) =>
  Object.entries(obj).forEach(([key, val]) => ((models as any)[key] = val));

describe('getModelPath', () => {
  it('gets a model if it exists', () => {
    const key = 'foo';
    const val = 'some-model-value';
    mockModels({
      default: {
        [key]: {
          url: val,
        },
      },
    });
    expect(getModelPath(key)).toEqual(val);
  });

  it('returns the model string if no model could be found', () => {
    mockModels({
      default: {
        bar: {
          url: 'bar',
        },
      },
    });
    expect(getModelPath('foo')).toEqual('foo');
  });

  it('gets a default model if no model is provided', () => {
    const key = 'foo';
    const val = 'some-model-value';
    mockModels({
      default: {
        [key]: {
          url: val,
        },
      },
      DEFAULT_MODEL: key,
    });
    expect(getModelPath()).toEqual(val);
  });
});

describe('loadModel', () => {
  it('loads a model', () => {
    (tf as any).loadLayersModel = jest.fn();
    mockModels({
      default: {
        foo: {
          url: 'foo',
        },
      },
      DEFAULT_MODEL: 'foo',
    });
    loadModel({
      model: 'foo',
    });
    expect(tf.loadLayersModel).toHaveBeenCalledWith('foo');
  });
});
