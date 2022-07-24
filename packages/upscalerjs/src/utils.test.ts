import * as tf from '@tensorflow/tfjs';
import { ModelDefinition } from '@upscalerjs/core';
import { 
  getModelDefinitionError,
  wrapGenerator, 
  isSingleArgProgress, 
  isMultiArgTensorProgress, 
  isString, 
  isFourDimensionalTensor, 
  isThreeDimensionalTensor, 
  isTensor, 
  warn, 
  isAborted,
  registerCustomLayers,
  tensorAsClampedArray,
  MISSING_MODEL_DEFINITION_ERROR,
  MISSING_MODEL_DEFINITION_PATH_ERROR,
  MISSING_MODEL_DEFINITION_SCALE_ERROR,
  LOGICAL_ERROR,
} from './utils';

jest.mock('@tensorflow/tfjs', () => ({
  ...(jest.requireActual('@tensorflow/tfjs') ),
  serialization: {
    registerClass: jest.fn(),
  },
}));

describe('registerCustomLayers', () => {
  it('does nothing if no custom layers are specified', () => {
    tf.serialization.registerClass = jest.fn();
    expect(tf.serialization.registerClass).toHaveBeenCalledTimes(0);
    const modelDefinition: ModelDefinition = {
      path: 'foo',
      scale: 2,
    };
    registerCustomLayers(modelDefinition);
    expect(tf.serialization.registerClass).toHaveBeenCalledTimes(0);
  });

  it('registers custom layers if provided', () => {
    tf.serialization.registerClass = jest.fn();
    expect(tf.serialization.registerClass).toHaveBeenCalledTimes(0);
    const modelDefinition: ModelDefinition = {
      path: 'foo',
      scale: 2,
      customLayers: ['foo','bar','baz'] as Array<any>,
    };
    registerCustomLayers(modelDefinition);
    expect(tf.serialization.registerClass).toHaveBeenCalledTimes(3);
  });
});

describe('isAborted', () => {
  it('handles an undefined signal', () => {
    expect(isAborted()).toEqual(false);
  });

  it('handles a non-aborted signal', () => {
    const controller = new AbortController();
    expect(isAborted(controller.signal)).toEqual(false);
  });

  it('handles an aborted signal', () => {
    const controller = new AbortController();
    controller.abort();
    expect(isAborted(controller.signal)).toEqual(true);
  });
});

describe('warn', () => {
  const origWarn = console.warn;
  afterEach(() => {
    console.warn = origWarn;
  });

  it('logs a string to console', () => {
    const fn = jest.fn();
    console.warn = fn;
    warn('foo');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('foo');
  });

  it('logs an array of strings to console', () => {
    const fn = jest.fn();
    console.warn = fn;
    warn([
      'foo',
      'bar',
      'baz'
    ]);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('foo\nbar\nbaz');
  });
});

describe('wrapGenerator', () => {
  it('wraps a sync generator', async () => {
    function* foo() {
      yield 'foo';
      yield 'bar';
      return 'baz';
    }

    const result = await wrapGenerator(foo())
    expect(result).toEqual('baz');
  });

  it('wraps an async generator', async () => {
    async function* foo() {
      yield 'foo';
      yield 'bar';
      return 'baz';
    }

    const result = await wrapGenerator(foo())
    expect(result).toEqual('baz');
  });

  it('calls a callback function in the generator', async () => {
    async function* foo() {
      yield 'foo';
      yield 'bar';
      return 'baz';
    }

    const callback = jest.fn();

    await wrapGenerator(foo(), callback);
    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback).toHaveBeenCalledWith('foo');
    expect(callback).toHaveBeenCalledWith('bar');
    expect(callback).not.toHaveBeenCalledWith('baz');
  });

  it('accepts an async callback function', async () => {
    async function* foo() {
      yield 'foo';
      yield 'bar';
      return 'baz';
    }

    const callback = jest.fn(async () => {});
    await wrapGenerator(foo(), callback);
    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback).toHaveBeenCalledWith('foo');
    expect(callback).toHaveBeenCalledWith('bar');
    expect(callback).not.toHaveBeenCalledWith('baz');
  });

  it('should await the async callback function', (done) => {
    async function* foo() {
      yield 'foo';
      yield 'bar';
      return 'baz';
    }

    const wait = () => new Promise(resolve => setTimeout(resolve));
    let called = 0;
    const callback = jest.fn(async () => {
      called++;
      await wait();
      if (called < 2) {
        expect(callback).toHaveBeenCalledTimes(called);
      } else if (called === 2) {
        done();
      }
    });
    wrapGenerator(foo(), callback);
  }, 100);
});

describe('isSingleArgProgress', () => {
  it('returns true for function', () => {
    expect(isSingleArgProgress(() => {})).toEqual(true);
  });

  it('returns true for a single arg function', () => {
    expect(isSingleArgProgress((_1: any) => {})).toEqual(true);
  });

  it('returns false for a double arg function', () => {
    expect(isSingleArgProgress((_1: any, _2: any) => {})).toEqual(false);
  });
});

describe('isMultiArgProgress', () => {
  it('returns false for a single arg function', () => {
    expect(isMultiArgTensorProgress((_1: any) => {}, undefined, undefined)).toEqual(false);
  });

  it('returns false for a zero arg function', () => {
    expect(isMultiArgTensorProgress(() => {}, undefined, undefined,  )).toEqual(false);
  });

  it('returns false for a multi arg tensor string function', () => {
    expect(isMultiArgTensorProgress((_1: any, _2: any) => {}, 'src', 'src')).toEqual(false);
  });

  it('returns false for a multi arg tensor string function with overloaded outputs', () => {
    expect(isMultiArgTensorProgress((_1: any, _2: any) => {}, 'tensor', 'src')).toEqual(false);
  });

  it('returns true for a multi arg tensor function', () => {
    expect(isMultiArgTensorProgress((_1: any, _2: any) => {}, 'tensor', 'tensor')).toEqual(true);
  });

  it('returns true for a multi arg tensor function with conflicting outputs', () => {
    expect(isMultiArgTensorProgress((_1: any, _2: any) => {}, 'src', 'tensor')).toEqual(true);
  });
});

describe('isString', () => {
  it('returns true for a string', () => {
    expect(isString('foo')).toEqual(true);
  });

  it('returns false for a non-string', () => {
    expect(isString({} as any)).toEqual(false);
  });
});

describe('isFourDimensionalTensor', () => {
  it('returns true if a 4d tensor', () => {
    expect(isFourDimensionalTensor(tf.tensor([[[[1,],],],]))).toEqual(true);
  });

  it('returns false for a 3d tensor', () => {
    expect(isFourDimensionalTensor(tf.tensor([[[1,],],]))).toEqual(false);
  });

    expect(isFourDimensionalTensor({} as any)).toEqual(false);
});

describe('isThreeDimensionalTensor', () => {
  it('returns true if a 3d tensor', () => {
    expect(isThreeDimensionalTensor(tf.tensor([[[1,],],]))).toEqual(true);
  });

  it('returns false for a 4d tensor', () => {
    expect(isThreeDimensionalTensor(tf.tensor([[[[1,],],],]))).toEqual(false);
  });

  it('defensively handles invalid input', () => {
    expect(isThreeDimensionalTensor({} as any)).toEqual(false);
  });
});

describe('isTensor', () => {
  it('returns true if a tensor', () => {
    expect(isTensor(tf.tensor([[1,],]))).toEqual(true);
  });
  it('returns false if not a tensor', () => {
    expect(isTensor([] as any)).toEqual(false);
  });
});

describe('tensorAsClampedArray', () => {
  it('returns an array', async () => {
    const result = await tensorAsClampedArray(tf.tensor([[[2, 2, 3], [2, 1, 4], [5,5,5],[6,6,6]]]))
    expect(Array.from(result)).toEqual([2,2,3,255,2,1,4,255,5,5,5,255,6,6,6,255]);
  });

  it('returns a clamped array', async () => {
    const result = await tensorAsClampedArray(tf.tensor([[[-100, 2, 3], [256, 1, 4], [500,5,5],[6,6,6]]]))
    expect(Array.from(result)).toEqual([0,2,3,255,255,1,4,255,255,5,5,255,6,6,6,255]);
  });
});

describe('getModelDefinitionError', () => {
  it('returns an error if no model definition is provided', () => {
    expect(getModelDefinitionError(undefined)).toEqual(MISSING_MODEL_DEFINITION_ERROR);
  });

  it('returns an error if path is not provided', () => {
    expect(getModelDefinitionError({ path: undefined } as unknown as ModelDefinition)).toEqual(MISSING_MODEL_DEFINITION_PATH_ERROR);
  });

  it('returns an error if scale is not provided', () => {
    expect(getModelDefinitionError({ path: 'foo', scale: undefined } as unknown as ModelDefinition)).toEqual(MISSING_MODEL_DEFINITION_SCALE_ERROR);
  });

  it('returns a generic error otherwise', () => {
    expect(getModelDefinitionError({ path: 'foo', scale: 2 } as unknown as ModelDefinition)).toEqual(LOGICAL_ERROR);
  });
})
