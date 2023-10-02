import { Tensor3D } from '@tensorflow/tfjs-node';
import { vi } from 'vitest';
import * as tf from '@tensorflow/tfjs-node';
import { 
  processAndDisposeOfTensor,
  wrapGenerator, 
  isSingleArgProgress, 
  isMultiArgTensorProgress, 
  warn, 
  isAborted,
} from './utils';
import {
  ModelDefinition,
  MODEL_DEFINITION_VALIDATION_CHECK_ERROR_TYPE,
} from '@upscalerjs/core';
import {
  ERROR_INVALID_MODEL_TYPE,
  ERROR_MODEL_DEFINITION_BUG, 
  getModelDefinitionError,
} from './errors-and-warnings';

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
    const fn = vi.fn();
    console.warn = fn;
    warn('foo');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('foo');
  });

  it('logs an array of strings to console', () => {
    const fn = vi.fn();
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

    const callback = vi.fn();

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

    const callback = vi.fn(async () => {});
    await wrapGenerator(foo(), callback);
    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback).toHaveBeenCalledWith('foo');
    expect(callback).toHaveBeenCalledWith('bar');
    expect(callback).not.toHaveBeenCalledWith('baz');
  });

  it('should await the async callback function', () => new Promise<void>(done => {
    async function* foo() {
      yield 'foo';
      yield 'bar';
      return 'baz';
    }

    const wait = () => new Promise(resolve => setTimeout(resolve));
    let called = 0;
    const callback = vi.fn(async () => {
      called++;
      await wait();
      if (called < 2) {
        expect(callback).toHaveBeenCalledTimes(called);
      } else if (called === 2) {
        done();
      }
    });
    wrapGenerator(foo(), callback);
  }), 100);
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

  it('returns true for a multi arg tensor function with conflicting outputs with an undefined progressOutput', () => {
    expect(isMultiArgTensorProgress((_1: any, _2: any) => {}, 'tensor', undefined)).toEqual(true);
  });
});

describe('getModelDefinitionError', () => {
  it('returns an error if invalid model type is provided', () => {
    const err = getModelDefinitionError(MODEL_DEFINITION_VALIDATION_CHECK_ERROR_TYPE.INVALID_MODEL_TYPE, { path: 'foo', scale: 2, modelType: 'foo' } as unknown as ModelDefinition);
    expect(err.message).toEqual(ERROR_INVALID_MODEL_TYPE('foo'));
  });

  it('returns a generic error otherwise', () => {
    const err = getModelDefinitionError(MODEL_DEFINITION_VALIDATION_CHECK_ERROR_TYPE.UNDEFINED, { path: 'foo', scale: 2, modelType: 'foo' } as unknown as ModelDefinition);
    expect(err.message).toEqual(ERROR_MODEL_DEFINITION_BUG);
  });
})

describe('processAndDisposeOfTensor', () => {
  let tensorIndex = 0;
  class MockTensor {
    name = `tensor-${tensorIndex++}`;
    isDisposed = false;

    value?: number;
    mockDispose: typeof vi.fn = vi.fn().mockImplementation(() => {});

    constructor({
      mockDispose,
      value,
    }: {
      mockDispose?: typeof vi.fn;
      value?: number;
    }) {
      if (mockDispose) {
        this.mockDispose = mockDispose;
      }
      this.value = value;
    }

    dispose() {
      this.isDisposed = true;
      return this.mockDispose();
    }

    clone() {
      return new MockTensor({
        mockDispose: this.mockDispose,
        value: this.value,
      });
    }

    add(value: number) {
      if (!this.value) {
        throw new Error('No value');
      }
      return new MockTensor({
        mockDispose: this.mockDispose,
        value: this.value + value,
      });
    }

    mul(value: number) {
      if (!this.value) {
        throw new Error('No value');
      }
      return new MockTensor({
        mockDispose: this.mockDispose,
        value: this.value * value,
      });
    }

    div(value: number) {
      if (!this.value) {
        throw new Error('No value');
      }
      return new MockTensor({
        mockDispose: this.mockDispose,
        value: this.value / value,
      });
    }
  }

  it('returns a tensor as is if given no process function', () => {
    const mockDispose = vi.fn();
    const mockedTensor = new MockTensor({ mockDispose });
    const returnedTensor = processAndDisposeOfTensor(tf, mockedTensor as any as Tensor3D);
    expect(returnedTensor).toEqual(mockedTensor);
    expect(mockDispose).not.toHaveBeenCalled();
  });

  it('does not dispose of tensor if no transformations are done to that tensor', () => {
    const mockDispose = vi.fn();
    const mockedTensor = new MockTensor({ mockDispose });
    const returnedTensor = processAndDisposeOfTensor(tf, mockedTensor as any as Tensor3D, t => t);
    expect(returnedTensor).toEqual(mockedTensor);
    expect(mockDispose).not.toHaveBeenCalled();
  });

  it('processes a tensor and disposes of it if given a process function', () => {
    const mockDispose = vi.fn();
    const process = vi.fn().mockImplementation(t => t.clone()); // return the tensor through
    const mockedTensor = new MockTensor({ mockDispose });
    const returnedTensor = processAndDisposeOfTensor(tf, mockedTensor as any as Tensor3D, process);
    expect(process).toHaveBeenCalledTimes(1);
    expect(mockDispose).toHaveBeenCalledTimes(1);
    expect(mockedTensor.isDisposed).toEqual(true);
    expect(returnedTensor.isDisposed).toEqual(false);
  });

  it('processes a tensor and does not dispose of it if it is already disposed', () => {
    const mockDispose = vi.fn();
    const mockedTensor = new MockTensor({ mockDispose });
    const process = vi.fn().mockImplementation((t: Tensor3D) => {
      t.dispose();
      return t;
    });
    const returnedTensor = processAndDisposeOfTensor(tf, mockedTensor as any as Tensor3D, process);
    expect(returnedTensor).toEqual(mockedTensor);
    expect(process).toHaveBeenCalledTimes(1);
    expect(mockDispose).toHaveBeenCalledTimes(1);
  });

  it('processes a tensor multiple times if given multiple process functions', () => {
    const mockDispose = vi.fn();
    const mockedTensor = new MockTensor({ mockDispose, value: 1 });
    const processA = vi.fn().mockImplementation((t) => t.add(2)); // 3
    const processB = vi.fn().mockImplementation((t) => t.mul(3)); // 9
    const processC = vi.fn().mockImplementation((t) => t.div(2)); // 4.5
    const returnedTensor = processAndDisposeOfTensor(tf, mockedTensor as any as Tensor3D, processA, processB, processC);
    expect(returnedTensor.value).toEqual(4.5);
    expect(processA).toHaveBeenCalledTimes(1);
    expect(processB).toHaveBeenCalledTimes(1);
    expect(processC).toHaveBeenCalledTimes(1);
    expect(mockDispose).toHaveBeenCalledTimes(1);
  });
});

