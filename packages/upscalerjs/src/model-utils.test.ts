import { mock, mockFn } from '../../../test/lib/shared/mockers';
import { tf as _tf, } from './dependencies.generated';
import { 
  parseModelDefinition,
  getModel,
  loadTfModel,
  parsePatchAndInputShapes,
  getModelInputShape,
  getPatchSizeAsMultiple,
} from './model-utils';
import {
  warn as _warn,
} from './utils';
import {
  isLayersModel as _isLayersModel,
} from './isLayersModel';
import {
  isShape4D as _isShape4D,
  isFixedShape4D as _isFixedShape4D,
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
  WARNING_UNDEFINED_PADDING,
  getModelDefinitionError,
  MODEL_INPUT_SIZE_MUST_BE_SQUARE,
  GET_INVALID_PATCH_SIZE_AND_PADDING,
  GET_WARNING_PATCH_SIZE_INDIVISIBLE_BY_DIVISIBILITY_FACTOR,
  WARNING_DEPRECATED_MODEL_DEFINITION_FN,
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

jest.mock('./utils', () => {
  const { warn, ...rest } = jest.requireActual('./utils');
  return {
    ...rest,
    warn: jest.fn().mockImplementation(warn),
  };
});

jest.mock('@upscalerjs/core', () => {
  const { isValidRange, isFixedShape4D, isShape4D, ...core } = jest.requireActual('@upscalerjs/core');
  return {
    ...core,
    isShape4D: jest.fn().mockImplementation(isShape4D),
    isFixedShape4D: jest.fn().mockImplementation(isFixedShape4D),
    isValidRange: jest.fn().mockImplementation(isValidRange),
  };
});

const tf = mock(_tf);
const isLayersModel = mockFn(_isLayersModel);
const isFixedShape4D = mockFn(_isFixedShape4D);
const isShape4D = mockFn(_isShape4D);
const warn = mockFn(_warn);

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
  beforeEach(() => {
    warn.mockImplementation(() => {});
  });

  afterEach(() => {
    warn.mockClear();
  });

  describe('ModelDefinition', () => {
    it('returns model definition', async () => {
      const modelDefinition: ModelDefinition = {
        modelType: 'layers',
        path: 'foo',
        scale: 2,
      };

      expect(await getModel(modelDefinition)).toEqual(modelDefinition)
      expect(warn).not.toHaveBeenCalled();
    });

    it('calls setup if defined on a model definition', async () => {
      const setup = jest.fn().mockImplementation(() => {});
      const modelDefinition: ModelDefinition = {
        setup,
        modelType: 'layers',
        path: 'foo',
        scale: 2,
      };

      expect(await getModel(modelDefinition)).toEqual(modelDefinition)
      expect(setup).toHaveBeenCalled();
      expect(warn).not.toHaveBeenCalled();
    });

    it('awaits an async setup if defined on a model definition', async () => {
      let complete = false;
      const setup = jest.fn().mockImplementation(async () => {
        await wait(0);
        complete = true;
      });
      const modelDefinition: ModelDefinition = {
        setup,
        modelType: 'layers',
        path: 'foo',
        scale: 2,
      };

      expect(await getModel(modelDefinition)).toEqual(modelDefinition)
      expect(setup).toHaveBeenCalled();
      expect(complete).toEqual(true);
      expect(warn).not.toHaveBeenCalled();
    });
  });

  describe('ModelDefinitionFn', () => {
    it('returns model definition from model definition fn', async () => {
      const modelDefinition: ModelDefinition = {
        path: 'foo',
        scale: 2,
        modelType: 'layers',
      };
      const modelDefinitionFn: ModelDefinitionFn = () => modelDefinition;

      expect(await getModel(modelDefinitionFn)).toEqual(modelDefinition);
      expect(warn).toHaveBeenCalledWith(WARNING_DEPRECATED_MODEL_DEFINITION_FN);
      expect(warn).toHaveBeenCalledTimes(1);
    });

    it('calls setup if defined on a model function definition', async () => {
      const setup = jest.fn().mockImplementation(() => { });
      const modelDefinition: ModelDefinition = {
        setup,
        modelType: 'layers',
        path: 'foo',
        scale: 2,
      };

      const modelDefinitionFn: ModelDefinitionFn = () => modelDefinition;

      expect(await getModel(modelDefinitionFn)).toEqual(modelDefinition)
      expect(setup).toHaveBeenCalled();
      expect(warn).toHaveBeenCalledWith(WARNING_DEPRECATED_MODEL_DEFINITION_FN);
      expect(warn).toHaveBeenCalledTimes(1);
    });
  });
});

describe('loadTfModel', () => {
  afterEach(() => {
    tf.loadLayersModel.mockClear();
    tf.loadGraphModel.mockClear();
  });

  it('loads a graph model if graph is specified', async () => {
    tf.loadGraphModel = jest.fn().mockImplementation((async () => 'graph' as any as _tf.GraphModel));
    tf.loadLayersModel = jest.fn().mockImplementation((async () => 'layers' as any as _tf.LayersModel));
    const model = await loadTfModel('foo', 'graph');
    expect(model).toEqual('graph');
    expect(tf.loadLayersModel).not.toHaveBeenCalled();
    expect(tf.loadGraphModel).toHaveBeenCalled();
  });

  it('loads a layers model if layer is specified', async () => {
    tf.loadGraphModel = jest.fn().mockImplementation((async () => 'graph' as any as _tf.GraphModel));
    tf.loadLayersModel = jest.fn().mockImplementation((async () => 'layers' as any as _tf.LayersModel));
    const model = await loadTfModel('bar', 'layers');
    expect(model).toEqual('layers');
    expect(tf.loadLayersModel).toHaveBeenCalled();
    expect(tf.loadGraphModel).not.toHaveBeenCalled();
  });

  it('loads a layers model if no argument is specified', async () => {
    tf.loadGraphModel = jest.fn().mockImplementation((async () => 'graph' as any as _tf.GraphModel));
    tf.loadLayersModel = jest.fn().mockImplementation((async () => 'layers' as any as _tf.LayersModel));
    const model = await loadTfModel('bar');
    expect(model).toEqual('layers');
    expect(tf.loadLayersModel).toHaveBeenCalled();
    expect(tf.loadGraphModel).not.toHaveBeenCalled();
  });
});

describe('parsePatchAndInputShapes', () => {
  beforeEach(() => {
    isLayersModel.mockImplementation(() => true);
    warn.mockImplementation(() => {});
  });

  afterEach(() => {
    isLayersModel.mockClear();
    isFixedShape4D.mockClear();
    warn.mockClear();
  });

  it('throws if given invalid patch size', () => {
    const patchSize = -1;
    const modelPackage = {
      model: {
        layers: [{
          batchInputShape: [null, null, null, 3],
        }],
      }
    } as ModelPackage;
    expect(() => parsePatchAndInputShapes(modelPackage, { patchSize, padding: 8 }, [null, 9, 9, 3])).toThrow(GET_INVALID_PATCH_SIZE(patchSize));
    expect(warn).not.toHaveBeenCalled();
  });

  it('warns if given a patch size but no padding', () => {
    const model = {
      layers: [{
        batchInputShape: [null, null, null, 3],
      }],
    } as _tf.LayersModel;
    const modelPackage: ModelPackage = {
      modelDefinition: {
        modelType: 'layers',
        path: 'foo',
      },
      model,
    };
    parsePatchAndInputShapes(modelPackage, { patchSize: 9 }, [null, 9, 9, 3]);
    expect(warn).toHaveBeenCalledWith(WARNING_UNDEFINED_PADDING);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('throws if given invalid patch size and padding', () => {
    const patchSize = 4;
    const padding = 2;
    const modelPackage = {
      model: {
        layers: [{
          batchInputShape: [null, null, null, 3],
        }],
      }
    } as ModelPackage;
    expect(() => parsePatchAndInputShapes(modelPackage, { patchSize, padding }, [null, 9, 9, 3])).toThrow(GET_INVALID_PATCH_SIZE_AND_PADDING(patchSize, padding));
  });

  describe('Input size', () => {
    it('warns if provided an inputSize and patchSize', () => {
      const modelPackage: ModelPackage = {
        model: {
          layers: [{
            batchInputShape: [null, 9, 9, 3],
          }],
        },
      } as ModelPackage;
      parsePatchAndInputShapes(modelPackage, { patchSize: 9, padding: 2 }, [ null, 9, 9, 3]);
      expect(warn).toHaveBeenCalledWith(WARNING_INPUT_SIZE_AND_PATCH_SIZE);
      expect(warn).toHaveBeenCalledTimes(1);
    });

    it('throws if input size is not square', () => {
      const modelPackage: ModelPackage = {
        model: {
          layers: [{
            batchInputShape: [null, 9, 8, 3],
          }],
        },
      } as ModelPackage;
      expect(() => parsePatchAndInputShapes(modelPackage, { patchSize: 9, padding: 1 }, [ null, 9, 9, 3])).toThrowError(MODEL_INPUT_SIZE_MUST_BE_SQUARE);
      expect(warn).toHaveBeenCalledWith(WARNING_INPUT_SIZE_AND_PATCH_SIZE);
    });

    it('returns the appropriate patch size', () => {
      const modelPackage: ModelPackage = {
        model: {
          layers: [{
            batchInputShape: [null, 9, 9, 3],
          }],
        },
      } as ModelPackage;
      expect(parsePatchAndInputShapes(modelPackage, { patchSize: 3, padding: 1 }, [ null, 9, 9, 3])).toEqual({
        patchSize: 9,
        padding: 1,
        modelInputShape: [null, 9, 9, 3],
      });
      expect(warn).toHaveBeenCalledWith(WARNING_INPUT_SIZE_AND_PATCH_SIZE);
      expect(warn).toHaveBeenCalledTimes(1);
    });
  });

  describe('divisibilityFactor', () => {
    it('returns the appropriate input shape if patch size is undefined and image size is a multiple', () => {
      const modelDefinition: ModelDefinition = {
        modelType: 'layers',
        path: 'foo',
        divisibilityFactor: 4,
      };
      const modelPackage = {
        model: {
          layers: [{
            batchInputShape: [null, null, null, 3],
          }],
        },
        modelDefinition,
      } as ModelPackage;
      expect(parsePatchAndInputShapes(modelPackage, {}, [null, 4, 4, 3])).toEqual({
        patchSize: undefined,
        padding: undefined,
        modelInputShape: [null, 4, 4, 3],
      });
      expect(warn).not.toHaveBeenCalled();
    });

    it('returns the appropriate input shape if patch size is undefined', () => {
      const modelDefinition: ModelDefinition = {
        modelType: 'layers',
        path: 'foo',
        divisibilityFactor: 4,
      };
      const modelPackage = {
        model: {
          layers: [{
            batchInputShape: [null, null, null, 3],
          }],
        },
        modelDefinition,
      } as ModelPackage;
      expect(parsePatchAndInputShapes(modelPackage, {}, [null, 3, 3, 3])).toEqual({
        patchSize: undefined,
        padding: undefined,
        modelInputShape: [null, 4, 4, 3],
      });
      expect(warn).not.toHaveBeenCalled();
    });

    it('returns the appropriate input shape if patch size is defined and a multiple of divisibility factor', () => {
      const modelDefinition: ModelDefinition = {
        modelType: 'layers',
        path: 'foo',
        divisibilityFactor: 4,
      };
      const modelPackage = {
        model: {
          layers: [{
            batchInputShape: [null, null, null, 3],
          }],
        },
        modelDefinition,
      } as ModelPackage;
      expect(parsePatchAndInputShapes(modelPackage, {
        patchSize: 8,
      }, [null, 3, 3, 3])).toEqual({
        patchSize: 8,
        padding: undefined,
        modelInputShape: [null, 8, 8, 3],
      });
      expect(warn).toHaveBeenCalledWith(WARNING_UNDEFINED_PADDING);
      expect(warn).toHaveBeenCalledTimes(1);
    });

    it('returns the appropriate input shape if patch size is defined and not a multiple of divisibility factor', () => {
      const modelDefinition: ModelDefinition = {
        modelType: 'layers',
        path: 'foo',
        divisibilityFactor: 4,
      };
      const modelPackage = {
        model: {
          layers: [{
            batchInputShape: [null, null, null, 3],
          }],
        },
        modelDefinition,
      } as ModelPackage;
      expect(parsePatchAndInputShapes(modelPackage, {
        patchSize: 7,
      }, [null, 3, 3, 3])).toEqual({
        patchSize: 8,
        padding: undefined,
        modelInputShape: [null, 8, 8, 3],
      });
      expect(warn).toHaveBeenCalledWith(WARNING_UNDEFINED_PADDING);
      expect(warn).toHaveBeenCalledWith(GET_WARNING_PATCH_SIZE_INDIVISIBLE_BY_DIVISIBILITY_FACTOR(7, 4, 8));
      expect(warn).toHaveBeenCalledTimes(2);
    });

    it('returns the appropriate input shape if patch size and padding are defined and a multiple of divisibility factor', () => {
      const modelDefinition: ModelDefinition = {
        modelType: 'layers',
        path: 'foo',
        divisibilityFactor: 4,
      };
      const modelPackage = {
        model: {
          layers: [{
            batchInputShape: [null, null, null, 3],
          }],
        },
        modelDefinition,
      } as ModelPackage;
      expect(parsePatchAndInputShapes(modelPackage, {
        patchSize: 4,
        padding: 1,
      }, [null, 3, 3, 3])).toEqual({
        patchSize: 4,
        padding: 1,
        modelInputShape: [null, 4, 4, 3],
      });
      expect(warn).not.toHaveBeenCalled();
    });

    it('returns the appropriate input shape if patch size and padding are defined and not a multiple of divisibility factor', () => {
      const modelDefinition: ModelDefinition = {
        modelType: 'layers',
        path: 'foo',
        divisibilityFactor: 5,
      };
      const modelPackage = {
        model: {
          layers: [{
            batchInputShape: [null, null, null, 3],
          }],
        },
        modelDefinition,
      } as ModelPackage;
      expect(parsePatchAndInputShapes(modelPackage, {
        patchSize: 4,
        padding: 1,
      }, [null, 3, 3, 3])).toEqual({
        patchSize: 5,
        padding: 1,
        modelInputShape: [null, 5, 5, 3],
      });
      expect(warn).toHaveBeenCalledWith(GET_WARNING_PATCH_SIZE_INDIVISIBLE_BY_DIVISIBILITY_FACTOR(4, 5, 5));
      expect(warn).toHaveBeenCalledTimes(1);
    });
  });

  it('passes patchSize and padding through unadulterated', () => {
    const model = {
      layers: [{
        batchInputShape: [null, null, null, 3],
      }],
    } as _tf.LayersModel;
    const modelPackage: ModelPackage = {
      modelDefinition: {
        modelType: 'layers',
        path: 'foo',
      },
      model,
    };
    expect(parsePatchAndInputShapes(modelPackage, { patchSize: 9, padding: 1 }, [ null, 9, 9, 3])).toEqual({
      patchSize: 9,
      padding: 1,
      modelInputShape: undefined,
    })
    expect(warn).not.toHaveBeenCalled();
  });

  it('warns if provided a patch size without padding', () => {
    const modelPackage: ModelPackage = {
      model: {
        layers: [{
          batchInputShape: [null, null, null, 3],
        }],
      },
      modelDefinition: {},
    } as ModelPackage;
    parsePatchAndInputShapes(modelPackage, { patchSize: 9 }, [ null, 9, 9, 3]);
    expect(warn).toHaveBeenCalledWith(WARNING_UNDEFINED_PADDING);
  });

});

describe('getModelInputShape', () => {
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

describe('getPatchSizeAsMultiple', () => {
  it('returns patch size if divisibility factor is equal to it', () => {
    expect(getPatchSizeAsMultiple(2, 2)).toEqual(2);
  });

  it('returns patch size if divisibility factor factors into it', () => {
    expect(getPatchSizeAsMultiple(2, 4)).toEqual(4);
  });

  it('returns increased patch size if it is smaller than divisibility factor', () => {
    expect(getPatchSizeAsMultiple(2, 1)).toEqual(2);
  });

  it('returns increased patch size if it is smaller than a multiple of divisibility factor', () => {
    expect(getPatchSizeAsMultiple(2, 3)).toEqual(4);
  });
});
