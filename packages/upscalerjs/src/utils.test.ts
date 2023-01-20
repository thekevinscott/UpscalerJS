import { Tensor3D, } from '@tensorflow/tfjs-node';
import { tf, tf as _tf, } from './dependencies.generated';
import { mock } from '../../../test/lib/shared/mockers';
import { 
  tensorAsClampedArray,
  processAndDisposeOfTensor,
  getModelDefinitionError,
  wrapGenerator, 
  isSingleArgProgress, 
  isMultiArgTensorProgress, 
  warn, 
  isAborted,
  registerCustomLayers,
  ERROR_MISSING_MODEL_DEFINITION_PATH,
  getModel,
  ERROR_MODEL_DEFINITION_BUG,
  ERROR_MISSING_MODEL_DEFINITION_SCALE,
} from './utils';
import { ModelDefinition, ModelDefinitionFn } from '@upscalerjs/core';

jest.mock('./dependencies.generated', () => {
  const { tf, ...dependencies } = jest.requireActual('./dependencies.generated');
  return {
    ...dependencies,
    tf: {
      ...tf,
      registerOp: jest.fn(),
      serialization: {
        registerClass: jest.fn(),
      },
    },
  };
});

const tf = mock(_tf);
const tfSerialization = mock(_tf.serialization);

describe('registerCustomLayers', () => {
  afterEach(() => {
    tfSerialization.registerClass.mockClear();
    tf.registerOp.mockClear();
  });

  it('does nothing if no custom layers are specified', () => {
    tfSerialization.registerClass = jest.fn();
    tf.registerOp = jest.fn();
    expect(tfSerialization.registerClass).toHaveBeenCalledTimes(0);
    expect(tf.registerOp).toHaveBeenCalledTimes(0);
    const modelDefinition: ModelDefinition = {
      path: 'foo',
      scale: 2,
    };
    registerCustomLayers(modelDefinition);
    expect(tfSerialization.registerClass).toHaveBeenCalledTimes(0);
    expect(tf.registerOp).toHaveBeenCalledTimes(0);
  });

  it('registers custom layers if provided', () => {
    tfSerialization.registerClass = jest.fn();
    tf.registerOp = jest.fn();
    expect(tfSerialization.registerClass).toHaveBeenCalledTimes(0);
    expect(tf.registerOp).toHaveBeenCalledTimes(0);
    const modelDefinition: ModelDefinition = {
      path: 'foo',
      scale: 2,
      customLayers: ['foo','bar','baz'] as Array<any>,
    };
    registerCustomLayers(modelDefinition);
    expect(tfSerialization.registerClass).toHaveBeenCalledTimes(3);
    expect(tf.registerOp).toHaveBeenCalledTimes(0);
  });

  it('registers custom ops if provided', () => {
    tfSerialization.registerClass = jest.fn();
    tf.registerOp = jest.fn();
    expect(tfSerialization.registerClass).toHaveBeenCalledTimes(0);
    expect(tf.registerOp).toHaveBeenCalledTimes(0);
    const customOps: { name: string; op: tf.OpExecutor }[] = [
      {
        name: 'foo',
        op: () => tf.tensor([]),
      },
      {
        name: 'bar',
        op: () => tf.tensor([]),
      },
      {
        name: 'baz',
        op: () => tf.tensor([]),
      },
    ];
    const modelDefinition: ModelDefinition = {
      path: 'foo',
      scale: 2,
      customOps,
    };
    registerCustomLayers(modelDefinition);
    expect(tfSerialization.registerClass).toHaveBeenCalledTimes(0);
    expect(tf.registerOp).toHaveBeenCalledTimes(3);
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
    expect(isMultiArgTensorProgress((_1: any, _2: any) => {}, 'base64', 'base64')).toEqual(false);
  });

  it('returns false for a multi arg tensor string function with overloaded outputs', () => {
    expect(isMultiArgTensorProgress((_1: any, _2: any) => {}, 'tensor', 'base64')).toEqual(false);
  });

  it('returns true for a multi arg tensor function', () => {
    expect(isMultiArgTensorProgress((_1: any, _2: any) => {}, 'tensor', 'tensor')).toEqual(true);
  });

  it('returns true for a multi arg tensor function with conflicting outputs', () => {
    expect(isMultiArgTensorProgress((_1: any, _2: any) => {}, 'base64', 'tensor')).toEqual(true);
  });
});

describe('tensorAsClampedArray', () => {
  it('returns an array', () => {
    const result = tensorAsClampedArray(tf.tensor([[[2, 2, 3], [2, 1, 4], [5,5,5],[6,6,6], [7,7,7],[8,8,8]]]))
    expect(Array.from(result)).toEqual([2,2,3,255,2,1,4,255,5,5,5,255,6,6,6,255,7,7,7,255,8,8,8,255]);
  });

  it('returns a clamped array', () => {
    const result = tensorAsClampedArray(tf.tensor([[[-100, 2, 3], [256, 1, 4], [500,5,5],[6,6,6]]]))
    expect(Array.from(result)).toEqual([0,2,3,255,255,1,4,255,255,5,5,255,6,6,6,255]);
  });
});

describe('getModelDefinitionError', () => {
  it('returns an error if path is not provided', () => {
    const err = getModelDefinitionError({ path: undefined } as unknown as ModelDefinition);
    expect(err.message).toEqual(ERROR_MISSING_MODEL_DEFINITION_PATH);
  });

  it('returns an error if scale is not provided', () => {
    const err = getModelDefinitionError({ path: 'foo', scale: undefined } as unknown as ModelDefinition);
    expect(err.message).toEqual(ERROR_MISSING_MODEL_DEFINITION_SCALE);
  });

  it('returns a generic error otherwise', () => {
    const err = getModelDefinitionError({ path: 'foo', scale: 2 });
    expect(err.message).toEqual(ERROR_MODEL_DEFINITION_BUG);
  });
})

describe('getModel', () => {
  it('returns model definition', () => {
    const modelDefinition: ModelDefinition = {
      path: 'foo',
      scale: 2,
    };

    expect(getModel(modelDefinition)).toEqual(modelDefinition)
  });

  it('returns model definition from model definition fn', () => {
    const modelDefinition: ModelDefinition = {
      path: 'foo',
      scale: 2,
    };
    const modelDefinitionFn: ModelDefinitionFn = () => modelDefinition;

    expect(getModel(modelDefinitionFn)).toEqual(modelDefinition)
  });
});

describe('processAndDisposeOfTensor', () => {
  it('returns a tensor as is if given no process function', () => {
    const mockDispose = jest.fn();
    const mockTensor = jest.fn().mockImplementation(() => {
      return { dispose: mockDispose } as any as Tensor3D;
    });
    const mockedTensor = mockTensor();
    const value = processAndDisposeOfTensor(mockedTensor);
    expect(value).toEqual(mockedTensor);
    expect(mockDispose).not.toHaveBeenCalled();
  });

  it('processes a tensor and disposes of it if given a process function', () => {
    const mockDispose = jest.fn();
    const mockTensor = jest.fn().mockImplementation(() => {
      return { dispose: mockDispose } as any as Tensor3D;
    });
    const process = jest.fn().mockImplementation(() => 'foo');
    const value = processAndDisposeOfTensor(mockTensor(), process);
    expect(value).toEqual('foo');
    expect(process).toHaveBeenCalledTimes(1);
    expect(mockDispose).toHaveBeenCalledTimes(1);
  });

  it('processes a tensor and does not dispose of it if it is already disposed', () => {
    const mockDispose = jest.fn();
    const mockTensor = jest.fn().mockImplementation(() => {
      return { dispose: mockDispose, isDisposed: () => true } as any as Tensor3D;
    });
    const process = jest.fn().mockImplementation((t: Tensor3D) => {
      t.dispose();
      return 'foo';
    });
    const value = processAndDisposeOfTensor(mockTensor(), process);
    expect(value).toEqual('foo');
    expect(process).toHaveBeenCalledTimes(1);
    expect(mockDispose).toHaveBeenCalledTimes(1);
  });
});
