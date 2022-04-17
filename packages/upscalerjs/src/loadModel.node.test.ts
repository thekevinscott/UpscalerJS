import loadModel, {
} from './loadModel.node';
import * as models from './models';
import { tf } from './dependencies.generated';
import * as utils from './utils';
jest.mock('./models');
jest.mock('./dependencies.generated');
jest.mock('./utils', () => ({
  ...(jest.requireActual('./utils') ),
  warn: jest.fn(),
}));

const mockModels = (obj: { [index: string]: any }) =>
  Object.entries(obj).forEach(([key, val,]) => ((models as any)[key] = val));

describe('getModelPath', () => {
  it('gets a model if it exists', () => {
    const key = 'foo';
    const val = 'some-model-value';
    mockModels({
      default: {
        [key]: {
          url: val,
          scale: 2,
        },
      },
    });
    expect(
      getModelDefinition({
        model: key,
      }),
    ).toEqual({
      url: val,
      scale: 2,
    });
  });

  it('returns the model string if no model could be found', () => {
    mockModels({
      default: {
        bar: {
          url: 'bar',
        },
      },
    });
    expect(
      getModelDefinition({
        model: 'foo',
        scale: 2,
      }),
    ).toEqual({
      url: 'foo',
      scale: 2,
    });
  });

  it('gets a default model if no model is provided', () => {
    const key = 'foo';
    const val = 'some-model-value';
    mockModels({
      default: {
        [key]: {
          url: val,
          scale: 3,
        },
      },
      DEFAULT_MODEL: key,
    });
    expect(getModelDefinition()).toEqual({
      url: val,
      scale: 3,
    });
  });

  it('throws if a model is provided without a scale', () => {
    mockModels({
      default: {
        bar: {
          url: 'bar',
        },
      },
    });
    expect(() =>
      getModelDefinition({
        model: 'foo',
      }),
    ).toThrow();
  });

  it('throws if a model key is provided, but a scale is also provided', () => {
    mockModels({
      default: {
        bar: {
          url: 'bar',
        },
      },
    });
    expect(() =>
      getModelDefinition({
        model: 'bar',
        scale: 2,
      }),
    ).toThrow();
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
