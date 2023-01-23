import { GraphModel, Tensor3D, Tensor4D, ones } from '@tensorflow/tfjs-node';
import { LayersModel, tensor } from '@tensorflow/tfjs-node';
import { tf as _tf, } from './dependencies.generated';
import { mock, mockFn } from '../../../test/lib/shared/mockers';
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
  ERROR_INVALID_MODEL_TYPE,
  loadTfModel,
  scaleIncomingPixels,
  parsePatchAndInputSizes,
  WARNING_INPUT_SIZE_AND_PATCH_SIZE,
  padInput,
  trimInput,
  getInputShape,
  ERROR_WITH_MODEL_INPUT_SHAPE,
  scaleOutput,
} from './utils';
import {
  isLayersModel as _isLayersModel,
} from './isLayersModel';
import {
  isValidRange as _isValidRange,
  isShape4D as _isShape4D,
  CustomOp,
  ModelDefinition,
  ModelDefinitionFn,
 } from '@upscalerjs/core';

jest.mock('./dependencies.generated', () => {
  const { tf, ...dependencies } = jest.requireActual('./dependencies.generated');
  return {
    ...dependencies,
    tf: {
      ...tf,
      registerOp: jest.fn(),
      loadLayersModel: jest.fn(),
      loadGraphModel: jest.fn(),
      serialization: {
        registerClass: jest.fn(),
      },
    },
  };
});

jest.mock('./isLayersModel', () => {
  const { isLayersModel, ...rest } = jest.requireActual('./isLayersModel');
  return {
    ...rest,
    isLayersModel: jest.fn().mockImplementation(isLayersModel),
  };
});

jest.mock('@upscalerjs/core', () => {
  const { isValidRange, isShape4D, ...core } = jest.requireActual('@upscalerjs/core');
  return {
    ...core,
    isShape4D: jest.fn().mockImplementation(isShape4D),
    isValidRange: jest.fn().mockImplementation(isValidRange),
  };
});

const tf = mock(_tf);
const tfSerialization = mock(_tf.serialization);
const isLayersModel = mockFn(_isLayersModel);
const isShape4D = mockFn(_isShape4D);
const isValidRange = mockFn(_isValidRange);

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
    const customOps: CustomOp[] = [
      {
        name: 'foo',
        op: () => tensor([]),
      },
      {
        name: 'bar',
        op: () => tensor([]),
      },
      {
        name: 'baz',
        op: () => tensor([]),
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
    const result = tensorAsClampedArray(tensor([[[2, 2, 3], [2, 1, 4], [5, 5, 5], [6, 6, 6], [7, 7, 7], [8, 8, 8]]]))
    expect(Array.from(result)).toEqual([2, 2, 3, 255, 2, 1, 4, 255, 5, 5, 5, 255, 6, 6, 6, 255, 7, 7, 7, 255, 8, 8, 8, 255]);
  });

  it('returns a clamped array', () => {
    const result = tensorAsClampedArray(tensor([[[-100, 2, 3], [256, 1, 4], [500, 5, 5], [6, 6, 6]]]))
    expect(Array.from(result)).toEqual([0, 2, 3, 255, 255, 1, 4, 255, 255, 5, 5, 255, 6, 6, 6, 255]);
  });
});

describe('getModelDefinitionError', () => {
  it('returns an error if path is not provided', () => {
    const err = getModelDefinitionError({ path: undefined } as unknown as ModelDefinition);
    expect(err.message).toEqual(ERROR_MISSING_MODEL_DEFINITION_PATH);
  });

  it('returns an error if invalid model type is provided', () => {
    const err = getModelDefinitionError({ path: 'foo', scale: 2, modelType: 'foo' } as unknown as ModelDefinition);
    expect(err.message).toEqual(ERROR_INVALID_MODEL_TYPE('foo'));
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
  let tensorIndex = 0;
  class MockTensor {
    name = `tensor-${tensorIndex++}`;
    isDisposed = false;

    value?: number;
    mockDispose: typeof jest.fn = jest.fn().mockImplementation(() => {});

    constructor({
      mockDispose,
      value,
    }: {
      mockDispose?: typeof jest.fn;
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
    const mockDispose = jest.fn();
    const mockedTensor = new MockTensor({ mockDispose });
    const returnedTensor = processAndDisposeOfTensor(mockedTensor as any as Tensor3D);
    expect(returnedTensor).toEqual(mockedTensor);
    expect(mockDispose).not.toHaveBeenCalled();
  });

  it('does not dispose of tensor if no transformations are done to that tensor', () => {
    const mockDispose = jest.fn();
    const mockedTensor = new MockTensor({ mockDispose });
    const returnedTensor = processAndDisposeOfTensor(mockedTensor as any as Tensor3D, t => t);
    expect(returnedTensor).toEqual(mockedTensor);
    expect(mockDispose).not.toHaveBeenCalled();
  });

  it('processes a tensor and disposes of it if given a process function', () => {
    const mockDispose = jest.fn();
    const process = jest.fn().mockImplementation(t => t.clone()); // return the tensor through
    const mockedTensor = new MockTensor({ mockDispose });
    const returnedTensor = processAndDisposeOfTensor(mockedTensor as any as Tensor3D, process);
    expect(process).toHaveBeenCalledTimes(1);
    expect(mockDispose).toHaveBeenCalledTimes(1);
    expect(mockedTensor.isDisposed).toEqual(true);
    expect(returnedTensor.isDisposed).toEqual(false);
  });

  it('processes a tensor and does not dispose of it if it is already disposed', () => {
    const mockDispose = jest.fn();
    const mockedTensor = new MockTensor({ mockDispose });
    const process = jest.fn().mockImplementation((t: Tensor3D) => {
      t.dispose();
      return t;
    });
    const returnedTensor = processAndDisposeOfTensor(mockedTensor as any as Tensor3D, process);
    expect(returnedTensor).toEqual(mockedTensor);
    expect(process).toHaveBeenCalledTimes(1);
    expect(mockDispose).toHaveBeenCalledTimes(1);
  });

  it('processes a tensor multiple times if given multiple process functions', () => {
    const mockDispose = jest.fn();
    const mockedTensor = new MockTensor({ mockDispose, value: 1 });
    const processA = jest.fn().mockImplementation((t) => t.add(2)); // 3
    const processB = jest.fn().mockImplementation((t) => t.mul(3)); // 9
    const processC = jest.fn().mockImplementation((t) => t.div(2)); // 4.5
    const returnedTensor = processAndDisposeOfTensor(mockedTensor as any as Tensor3D, processA, processB, processC);
    expect(returnedTensor.value).toEqual(4.5);
    expect(processA).toHaveBeenCalledTimes(1);
    expect(processB).toHaveBeenCalledTimes(1);
    expect(processC).toHaveBeenCalledTimes(1);
    expect(mockDispose).toHaveBeenCalledTimes(1);
  });
});

describe('loadTfModel', () => {
  afterEach(() => {
    tf.loadLayersModel.mockClear();
    tf.loadGraphModel.mockClear();
  });

  it('loads a graph model if graph is specified', async () => {
    tf.loadGraphModel = jest.fn().mockImplementation((async () => 'graph' as any as GraphModel));
    tf.loadLayersModel = jest.fn().mockImplementation((async () => 'layers' as any as GraphModel));
    const model = await loadTfModel('foo', 'graph');
    expect(model).toEqual('graph');
    expect(tf.loadLayersModel).not.toHaveBeenCalled();
    expect(tf.loadGraphModel).toHaveBeenCalled();
  });

  it('loads a layers model if layer is specified', async () => {
    tf.loadGraphModel = jest.fn().mockImplementation((async () => 'graph' as any as GraphModel));
    tf.loadLayersModel = jest.fn().mockImplementation((async () => 'layers' as any as GraphModel));
    const model = await loadTfModel('bar', 'layers');
    expect(model).toEqual('layers');
    expect(tf.loadLayersModel).toHaveBeenCalled();
    expect(tf.loadGraphModel).not.toHaveBeenCalled();
  });

  it('loads a layers model if no argument is specified', async () => {
    tf.loadGraphModel = jest.fn().mockImplementation((async () => 'graph' as any as GraphModel));
    tf.loadLayersModel = jest.fn().mockImplementation((async () => 'layers' as any as GraphModel));
    const model = await loadTfModel('bar');
    expect(model).toEqual('layers');
    expect(tf.loadLayersModel).toHaveBeenCalled();
    expect(tf.loadGraphModel).not.toHaveBeenCalled();
  });
});

describe('scaleIncomingPixels', () => {
  it('returns unadulterated incoming pixels if given no range', () => tf.tidy(() => {
    const result = Array.from(scaleIncomingPixels()(tf.tensor4d([[[[0, 127, 255]]]])).dataSync());
    expect(result).toEqual([0, 127, 255]);
  }));

  it('returns unadulterated incoming pixels if given a range of 0-1', () => tf.tidy(() => {
    const result = Array.from(scaleIncomingPixels([0,255])(tf.tensor4d([[[[0, 127, 255]]]])).dataSync());
    expect(result).toEqual([0, 127, 255]);
  }));

  it('scales incoming pixels if given a range of 0-255', () => tf.tidy(() => {
    const result = Array.from(scaleIncomingPixels([0,1])(tf.tensor4d([[[[0, 127, 255]]]])).dataSync().map(n => Math.round(n * 100) / 100));
    expect(result).toEqual([0,.5,1]);
  }));
});

describe('parsePatchAndInputSizes', () => {
  const origWarn = console.warn;

  beforeEach(() => {
    isLayersModel.mockImplementation(() => true);
    isShape4D.mockImplementation(() => true);
  });

  afterEach(() => {
    console.warn = origWarn;
    isLayersModel.mockClear();
    isShape4D.mockClear();
  });

  it('passes patchSize and padding through unadulterated', () => {
    expect(parsePatchAndInputSizes({
      layers: [{
        batchInputShape: [null, null, null, 3],
      }],
    } as any as LayersModel, { patchSize: 9, padding: 8 })).toEqual({
      patchSize: 9,
      padding: 8,
    })
  })

  it('warns if provided an inputSize and patchSize', () => {
    const fn = jest.fn();
    console.warn = fn;
    warn('foo');
    parsePatchAndInputSizes({
      layers: [{
        batchInputShape: [null, 9, 9, 3],
      }],
    } as any as LayersModel, { patchSize: 9, padding: 8 });
    expect(fn).toHaveBeenCalledWith(WARNING_INPUT_SIZE_AND_PATCH_SIZE);
  });
});

describe('padInput', () => {
  beforeEach(() => {
    isShape4D.mockImplementation(() => true);
  });

  afterEach(() => {
    isShape4D.mockClear();
  });

  it('just returns the input if no inputSize is specified', () => {
    const t = ones([1, 4, 4, 3]) as Tensor4D;
    expect(padInput()(t)).toEqual(t);
  });

  it('just returns the input if inputSize is less than the shape of the tensor', () => {
    const t = ones([1, 4, 4, 3]) as Tensor4D;
    expect(padInput([null, 2, 2, 3])(t)).toEqual(t);
  });

  it('just returns the input if inputSize is equal to the width of the tensor', () => {
    const t = ones([1, 4, 8, 3]) as Tensor4D;
    expect(padInput([null, 4, 4, 3])(t)).toEqual(t);
  });

  it('just returns the input if inputSize is equal to the height of the tensor', () => {
    const t = ones([1, 8, 4, 3]) as Tensor4D;
    expect(padInput([null, 4, 4, 3])(t)).toEqual(t);
  });

  it('returns an image with padding if input size is greater than image', () => {
    const t = ones([1, 4, 4, 3]) as Tensor4D;
    const result = padInput([null, 6, 6, 3])(t);
    expect(result).not.toEqual(t);
    expect(result.shape).toEqual([1, 6, 6, 3]);
  });

  it('returns an image with padding if input size is greater than the height', () => {
    const t = ones([1, 4, 8, 3]) as Tensor4D;
    const result = padInput([null, 6, 6, 3])(t);
    expect(result).not.toEqual(t);
    expect(result.shape).toEqual([1, 6, 8, 3]);
  });

  it('returns an image with padding if input size is greater than the width', () => {
    const t = ones([1, 8, 4, 3]) as Tensor4D;
    const result = padInput([null, 6, 6, 3])(t);
    expect(result).not.toEqual(t);
    expect(result.shape).toEqual([1, 8, 6, 3]);
  });
});

describe('trimInput', () => {
  it('just returns the input if width and height are equal to pixels shape', () => {
    const t = ones([1, 4, 4, 3]) as Tensor4D;
    expect(trimInput([1, 4, 4, 3], 1)(t)).toEqual(t);
  });

  it('returns a sliced image if image height is smaller than pixels height', () => {
    const t = ones([1, 4, 4, 3]) as Tensor4D;
    const result = trimInput([1, 2, 4, 3], 1)(t);
    expect(result).not.toEqual(t);
    expect(result.shape).toEqual([1, 2, 4, 3]);
  });

  it('returns a sliced image if image width is smaller than pixels width', () => {
    const t = ones([1, 4, 4, 3]) as Tensor4D;
    const result = trimInput([1, 4, 2, 3], 1)(t);
    expect(result).not.toEqual(t);
    expect(result.shape).toEqual([1, 4, 2, 3]);
  });
});

describe('getInputShape', () => {
  afterEach(() => {
    isLayersModel.mockClear();
    isShape4D.mockClear();
  });

  it('returns layers model input shape if it is a layers model', () => {
    isLayersModel.mockImplementation(() => true);
    expect(getInputShape({
      layers: [{
        batchInputShape: [1, 2, 3, 4],
      }],
    } as any as LayersModel)).toEqual([1,2,3,4]);
  });

  it('returns graph model input shape if it is a layers model', () => {
    isLayersModel.mockImplementation(() => false);
    expect(getInputShape({
      inputs: [{
        shape: [1, 2, 3, 4],
      }],
    } as any as GraphModel)).toEqual([1, 2, 3, 4]);
  });

  it('throws if a model returns a non rank 4 shape', () => {
    isShape4D.mockImplementation(() => false);
    isLayersModel.mockImplementation(() => true);
    expect(() => getInputShape({
      layers: [{
        batchInputShape: [1, 2, 3, 4, 5],
      }],
    } as any as LayersModel)).toThrow(ERROR_WITH_MODEL_INPUT_SHAPE([1,2,3,4,5]));
  });
});

describe('scaleOutput', () => {
  afterEach(() => {
    isValidRange.mockClear();
  });

  it('returns tensor unadulterated if input shape is not valid', () => {
    isValidRange.mockImplementation(() => false);
    const tensor = ones([1, 2, 2, 1]) as Tensor4D;
    expect(scaleOutput()(tensor)).toEqual(tensor);
  });

  it('returns same tensor values if input shape is 0-255', () => {
    isValidRange.mockImplementation(() => true);
    const tensor = ones([1, 2, 2, 1]) as Tensor4D;
    expect(Array.from(scaleOutput([0, 255])(tensor).dataSync())).toEqual(Array.from(tensor.dataSync()));
  });

  it('returns multiplied tensor values if input shape is 0-1', () => {
    isValidRange.mockImplementation(() => true);
    const tensor = ones([1, 2, 2, 1]) as Tensor4D;
    expect(Array.from(scaleOutput([0, 1])(tensor).dataSync())).toEqual([255, 255, 255, 255,]);
  });
});
