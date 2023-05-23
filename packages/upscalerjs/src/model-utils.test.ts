import { GraphModel } from '@tensorflow/tfjs-node';
import { tf as _tf, } from './dependencies.generated';
import { mock, mockFn } from '../../../test/lib/shared/mockers';
import { 
  parseModelDefinition,
  getModel,
  loadTfModel,
  parsePatchAndInputSizes,
  getModelInputShape,
} from './model-utils';
import {
  warn,
} from './utils';
import {
  isLayersModel as _isLayersModel,
} from './isLayersModel';
import {
  isShape4D as _isShape4D,
  ModelDefinition,
  ModelDefinitionFn,
  MODEL_DEFINITION_VALIDATION_CHECK_ERROR_TYPE,
} from '@upscalerjs/core';
import { ModelPackage } from './types';
import {
  ERROR_INVALID_MODEL_TYPE,
  ERROR_MISSING_MODEL_DEFINITION_PATH, 
  ERROR_MODEL_DEFINITION_BUG, 
  ERROR_WITH_MODEL_INPUT_SHAPE, 
  GET_INVALID_PATCH_SIZE,
  WARNING_INPUT_SIZE_AND_PATCH_SIZE,
  getModelDefinitionError,
} from './errors-and-warnings';

jest.mock('./dependencies.generated', () => {
  const { tf, ...dependencies } = jest.requireActual('./dependencies.generated');
  return {
    ...dependencies,
    tf: {
      ...tf,
      registerOp: jest.fn(),
      loadLayersModel: jest.fn(),
      loadGraphModel: jest.fn(),
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
const isLayersModel = mockFn(_isLayersModel);
const isShape4D = mockFn(_isShape4D);

describe('getModelDefinitionError', () => {
  it('returns an error if path is not provided', () => {
    const err = getModelDefinitionError(MODEL_DEFINITION_VALIDATION_CHECK_ERROR_TYPE.MISSING_PATH, { path: 'foo', scale: 2, modelType: 'foo', } as unknown as ModelDefinition);
    expect(err.message).toEqual(ERROR_MISSING_MODEL_DEFINITION_PATH);
  });

  it('returns an error if invalid model type is provided', () => {
    const err = getModelDefinitionError(MODEL_DEFINITION_VALIDATION_CHECK_ERROR_TYPE.INVALID_MODEL_TYPE, { path: 'foo', scale: 2, modelType: 'foo' } as unknown as ModelDefinition);
    expect(err.message).toEqual(ERROR_INVALID_MODEL_TYPE('foo'));
  });

  it('returns a generic error otherwise', () => {
    const err = getModelDefinitionError(MODEL_DEFINITION_VALIDATION_CHECK_ERROR_TYPE.UNDEFINED, { path: 'foo', scale: 2, modelType: 'foo' } as unknown as ModelDefinition);
    expect(err.message).toEqual(ERROR_MODEL_DEFINITION_BUG);
  });
})

describe('getModel', () => {
  it('returns model definition', () => {
    const modelDefinition: ModelDefinition = {
      modelType: 'layers',
      path: 'foo',
      scale: 2,
    };

    expect(getModel(modelDefinition)).toEqual(modelDefinition)
  });

  it('returns model definition from model definition fn', () => {
    const modelDefinition: ModelDefinition = {
      path: 'foo',
      scale: 2,
      modelType: 'layers',
    };
    const modelDefinitionFn: ModelDefinitionFn = () => modelDefinition;

    expect(getModel(modelDefinitionFn)).toEqual(modelDefinition)
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
    const modelPackage = {
      model: {
        layers: [{
          batchInputShape: [null, null, null, 3],
        }],
      },
    } as ModelPackage;
    expect(parsePatchAndInputSizes(modelPackage, { patchSize: 9, padding: 8 })).toEqual({
      patchSize: 9,
      padding: 8,
    })
  });

  it('warns if provided an inputSize and patchSize', () => {
    const fn = jest.fn();
    console.warn = fn;
    warn('foo');
    const modelPackage: ModelPackage = {
      model: {
        layers: [{
          batchInputShape: [null, 9, 9, 3],
        }],
      },
    } as ModelPackage;
    parsePatchAndInputSizes(modelPackage, { patchSize: 9, padding: 8 });
    expect(fn).toHaveBeenCalledWith(WARNING_INPUT_SIZE_AND_PATCH_SIZE);
  });

  it('throws if given invalid patch size', () => {
    const patchSize = -1;
    expect(() => parsePatchAndInputSizes({
      model: {
        layers: [{
          batchInputShape: [null, null, null, 3],
        }],
      }
    } as ModelPackage, { patchSize, padding: 8 })).toThrow(GET_INVALID_PATCH_SIZE(patchSize));
  });
});

describe('getInputShape', () => {
  afterEach(() => {
    isLayersModel.mockClear();
    isShape4D.mockClear();
  });

  it('returns layers model input shape if it is a layers model', () => {
    isLayersModel.mockImplementation(() => true);
    expect(getModelInputShape({
      model: {
        layers: [{
          batchInputShape: [1, 2, 3, 4],
        }],
      },
    } as ModelPackage)).toEqual([1, 2, 3, 4]);
  });

  it('returns graph model input shape if it is a layers model', () => {
    isLayersModel.mockImplementation(() => false);
    expect(getModelInputShape({
      model: {
        inputs: [{
          shape: [1, 2, 3, 4],
        }],
      }
    } as ModelPackage)).toEqual([1, 2, 3, 4]);
  });

  it('throws if a model returns a non rank 4 shape', () => {
    isShape4D.mockImplementation(() => false);
    isLayersModel.mockImplementation(() => true);
    expect(() => getModelInputShape({
      model: {
        layers: [{
          batchInputShape: [1, 2, 3, 4, 5],
        }],
      }
    } as ModelPackage)).toThrow(ERROR_WITH_MODEL_INPUT_SHAPE([1, 2, 3, 4, 5]));
  });
});

describe('parseModelDefinition', () => {
  it('parses a model definition cleanly', () => {
    const modelDefinition: ModelDefinition = {
      modelType: 'layers',
      path: 'foo',
      scale: 2,
    };
    expect(parseModelDefinition(modelDefinition)).toEqual(modelDefinition);

  });
});


