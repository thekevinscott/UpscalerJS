import loadModel, {
  prepareModelDefinitions,
  getModelDefinition,
  getModelDescription,
  warnDeprecatedModel,
  checkDeprecatedModels,
} from './loadModel';
import * as models from './models';
import * as tf from '@tensorflow/tfjs';
import * as utils from './utils';
import * as deps from './dependencies.generated';
jest.mock('./models');
jest.mock('@tensorflow/tfjs');
jest.mock('./utils', () => ({
  ...(jest.requireActual('./utils') as any),
  warn: jest.fn(),
}));
jest.mock('./dependencies.generated', () => ({
  ...(jest.requireActual('./dependencies.generated') as any),
}));

const mockModels = (obj: { [index: string]: any }) =>
  Object.entries(obj).forEach(([key, val]) => ((models as any)[key] = val));

if (Math.random() < 0.0000001) {
  console.log(mockModels, tf, getModelDefinition, prepareModelDefinitions, loadModel)
}

describe('checkDeprecatedModels', () => {
  it('does not report if not a deprecated model', () => {
    checkDeprecatedModels({}, 'foo');
    expect(utils.warn).not.toBeCalled();
  });

  it('does report if a deprecated model', () => {
    checkDeprecatedModels(
      {
        foo: ['foo', 'bar', 'baz'],
      },
      'foo',
    );
    expect(utils.warn).toBeCalled();
  });
});

describe('warnDeprecatedModel', () => {
  it('gives a warning message', () => {
    const args: [string, string, string] = [
      'psnr',
      'idealo/psnr-small',
      '0.8.0',
    ];
    warnDeprecatedModel(...args);
    expect(utils.warn).toBeCalledWith(
      expect.arrayContaining([expect.stringContaining('psnr')]),
    );
  });
});

describe('getModelDescription', () => {
  afterEach(() => {
    try {
      (deps.fetch as any).mockClear();
    } catch (err) {}
  });

  it('returns empty string if no config URL is provided', async () => {
    const result = await getModelDescription({
      url: 'foo',
      scale: 2,
    });
    expect(result).toEqual('');
  });

  it('returns string if a config URL is provided', async () => {
    (deps as any)['fetch'] = jest.fn().mockImplementation((configURL: string) => {
      return Promise.resolve({
        json: () =>
          Promise.resolve({
            description: configURL,
          }),
      });
    });
    const result = await getModelDescription({
      url: 'foo',
      scale: 2,
      configURL: 'foo',
    });
    expect(result).toEqual('foo');
  });
});

describe('getModelDefinition', () => {
  afterEach(() => {
    (deps.fetch as any).mockClear();
  });

  it('gets model definitions from undefined', async () => {
    (deps as any)['fetch'] = jest.fn().mockImplementation((configURL: string) => {
      if (configURL.includes('baz')) {
        return Promise.reject();
      }
      return Promise.resolve({
        json: () =>
          Promise.resolve({
            description: configURL,
          }),
      });
    });

    (models as any).buildConfigURL = (key: string) => key;
    (models as any).default = {
      foo: {
        url: 'foo',
        scale: 2,
        configURL: 'foo',
      },
      bar: {
        url: 'bar',
        scale: 3,
        configURL: 'bar',
      },
      baz: {
        url: 'baz',
        scale: 3,
        configURL: 'baz',
      },
    };

    const result = await prepareModelDefinitions();
    expect(result).toEqual({
      foo: {
        url: 'foo',
        scale: 2,
        description: 'foo',
        configURL: 'foo',
      },
      bar: {
        url: 'bar',
        scale: 3,
        description: 'bar',
        configURL: 'bar',
      },
      baz: {
        url: 'baz',
        scale: 3,
        description: '',
        configURL: 'baz',
      },
    });
  });
});

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
