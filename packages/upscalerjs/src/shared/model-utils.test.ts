import { vi } from 'vitest';
import { 
  parseModelDefinition,
  getModel,
  loadTfModel,
  parsePatchAndInputShapes,
  getModelInputShape,
  getPatchSizeAsMultiple,
} from './model-utils';
import type * as utils  from './utils';
import {
  warn,
} from './utils';
import * as isLayersModel from './isLayersModel';
import { 
  MODEL_DEFINITION_VALIDATION_CHECK_ERROR_TYPE,
  ModelDefinition,
  ModelDefinitionFn,
 } from '../../../shared/src/types';
import type * as sharedConstants from '../../../shared/src/constants';
import { 
  isShape4D,
 } from '../../../shared/src/constants';
import { ModelPackage } from './types';
import {
  ERROR_INVALID_MODEL_TYPE,
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
import { GraphModel, LayersModel } from '@tensorflow/tfjs';
import * as tfn from '@tensorflow/tfjs-node';

vi.mock('@tensorflow/tfjs-node', async () => {
  const tf = await vi.importActual('@tensorflow/tfjs-node') as typeof tfn;
  return {
    ...tf,
    registerOp: vi.fn(),
    loadLayersModel: vi.fn(),
    loadGraphModel: vi.fn(),
  };
});

vi.mock('./isLayersModel', async () => {
  const { isLayersModel: _isLayersModel, ...rest } = await vi.importActual('./isLayersModel') as typeof isLayersModel;
  return {
    ...rest,
    isLayersModel: vi.fn().mockImplementation(_isLayersModel),
  };
});

vi.mock('./utils', async () => {
  const { warn, ...rest } = await vi.importActual('./utils') as typeof utils;
  return {
    ...rest,
    warn: vi.fn(),
  };
});

vi.mock('../../../shared/src/constants', async () => {
  const { isValidRange, isFixedShape4D, isShape4D, ...rest } = await vi.importActual('../../../shared/src/constants') as typeof sharedConstants;
  return {
    ...rest,
    isShape4D: vi.fn().mockImplementation(isShape4D),
    isFixedShape4D: vi.fn().mockImplementation(isFixedShape4D),
    isValidRange: vi.fn().mockImplementation(isValidRange),
  };
});

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('model-utils', () => {
  afterEach(() => {
    vi.clearAllMocks();
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

  describe('getModel', () => {
    describe('ModelDefinition', () => {
      it('returns model definition', async () => {
        const modelDefinition: ModelDefinition = {
          modelType: 'layers',
          path: 'foo',
          scale: 2,
        };

        expect(await getModel(tfn, modelDefinition)).toEqual(modelDefinition)
        expect(warn).not.toHaveBeenCalled();
      });

      it('calls setup if defined on a model definition', async () => {
        const setup = vi.fn().mockImplementation(() => { });
        const modelDefinition: ModelDefinition = {
          setup,
          modelType: 'layers',
          path: 'foo',
          scale: 2,
        };

        expect(await getModel(tfn, modelDefinition)).toEqual(modelDefinition)
        expect(setup).toHaveBeenCalled();
        expect(warn).not.toHaveBeenCalled();
      });

      it('awaits an async setup if defined on a model definition', async () => {
        let complete = false;
        const setup = vi.fn().mockImplementation(async () => {
          await wait(0);
          complete = true;
        });
        const modelDefinition: ModelDefinition = {
          setup,
          modelType: 'layers',
          path: 'foo',
          scale: 2,
        };

        expect(await getModel(tfn, modelDefinition)).toEqual(modelDefinition)
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

        expect(await getModel(tfn, modelDefinitionFn)).toEqual(modelDefinition);
        expect(warn).toHaveBeenCalledWith(WARNING_DEPRECATED_MODEL_DEFINITION_FN);
        expect(warn).toHaveBeenCalledTimes(1);
      });

      it('calls setup if defined on a model function definition', async () => {
        const setup = vi.fn().mockImplementation(() => { });
        const modelDefinition: ModelDefinition = {
          setup,
          modelType: 'layers',
          path: 'foo',
          scale: 2,
        };

        const modelDefinitionFn: ModelDefinitionFn = () => modelDefinition;

        expect(await getModel(tfn, modelDefinitionFn)).toEqual(modelDefinition)
        expect(setup).toHaveBeenCalled();
        expect(warn).toHaveBeenCalledWith(WARNING_DEPRECATED_MODEL_DEFINITION_FN);
        expect(warn).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('loadTfModel', () => {
    it('loads a graph model if graph is specified', async () => {
      tfn.loadGraphModel = vi.fn().mockImplementation((async () => 'graph' as any as GraphModel));
      tfn.loadLayersModel = vi.fn().mockImplementation((async () => 'layers' as any as LayersModel));
      const model = await loadTfModel(tfn, 'foo', 'graph');
      expect(model).toEqual('graph');
      expect(tfn.loadLayersModel).not.toHaveBeenCalled();
      expect(tfn.loadGraphModel).toHaveBeenCalled();
    });

    it('loads a layers model if layer is specified', async () => {
      tfn.loadGraphModel = vi.fn().mockImplementation((async () => 'graph' as any as GraphModel));
      tfn.loadLayersModel = vi.fn().mockImplementation((async () => 'layers' as any as LayersModel));
      const model = await loadTfModel(tfn, 'bar', 'layers');
      expect(model).toEqual('layers');
      expect(tfn.loadLayersModel).toHaveBeenCalled();
      expect(tfn.loadGraphModel).not.toHaveBeenCalled();
    });

    it('loads a layers model if no argument is specified', async () => {
      tfn.loadGraphModel = vi.fn().mockImplementation((async () => 'graph' as any as GraphModel));
      tfn.loadLayersModel = vi.fn().mockImplementation((async () => 'layers' as any as LayersModel));
      const model = await loadTfModel(tfn, 'bar');
      expect(model).toEqual('layers');
      expect(tfn.loadLayersModel).toHaveBeenCalled();
      expect(tfn.loadGraphModel).not.toHaveBeenCalled();
    });
  });

  describe('parsePatchAndInputShapes', () => {
    beforeEach(() => {
      vi.mocked(isLayersModel.isLayersModel).mockImplementation(() => true);
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
      expect(() => parsePatchAndInputShapes(tfn, modelPackage, { patchSize, padding: 8 }, [null, 9, 9, 3])).toThrow(GET_INVALID_PATCH_SIZE(patchSize));
      expect(warn).not.toHaveBeenCalled();
    });

    it('warns if given a patch size but no padding', () => {
      const model = {
        layers: [{
          batchInputShape: [null, null, null, 3],
        }],
      } as LayersModel;
      const modelPackage: ModelPackage = {
        modelDefinition: {
          modelType: 'layers',
          path: 'foo',
        },
        model,
      };
      parsePatchAndInputShapes(tfn, modelPackage, { patchSize: 9 }, [null, 9, 9, 3]);
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
      expect(() => parsePatchAndInputShapes(tfn, modelPackage, { patchSize, padding }, [null, 9, 9, 3])).toThrow(GET_INVALID_PATCH_SIZE_AND_PADDING(patchSize, padding));
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
        parsePatchAndInputShapes(tfn, modelPackage, { patchSize: 9, padding: 2 }, [null, 9, 9, 3]);
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
        expect(() => parsePatchAndInputShapes(tfn, modelPackage, { patchSize: 9, padding: 1 }, [null, 9, 9, 3])).toThrowError(MODEL_INPUT_SIZE_MUST_BE_SQUARE);
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
        expect(parsePatchAndInputShapes(tfn, modelPackage, { patchSize: 3, padding: 1 }, [null, 9, 9, 3])).toEqual({
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
        expect(parsePatchAndInputShapes(tfn, modelPackage, {}, [null, 4, 4, 3])).toEqual({
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
        expect(parsePatchAndInputShapes(tfn, modelPackage, {}, [null, 3, 3, 3])).toEqual({
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
        expect(parsePatchAndInputShapes(tfn, modelPackage, {
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
        expect(parsePatchAndInputShapes(tfn, modelPackage, {
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
        expect(parsePatchAndInputShapes(tfn, modelPackage, {
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
        expect(parsePatchAndInputShapes(tfn, modelPackage, {
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
      } as LayersModel;
      const modelPackage: ModelPackage = {
        modelDefinition: {
          modelType: 'layers',
          path: 'foo',
        },
        model,
      };
      expect(parsePatchAndInputShapes(tfn, modelPackage, { patchSize: 9, padding: 1 }, [null, 9, 9, 3])).toEqual({
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
      parsePatchAndInputShapes(tfn, modelPackage, { patchSize: 9 }, [null, 9, 9, 3]);
      expect(warn).toHaveBeenCalledWith(WARNING_UNDEFINED_PADDING);
    });

  });

  describe('getModelInputShape', () => {
    it('returns layers model input shape if it is a layers model', () => {
      vi.mocked(isLayersModel.isLayersModel).mockImplementation(() => true);
      expect(getModelInputShape(tfn, {
        model: {
          layers: [{
            batchInputShape: [1, 2, 3, 4],
          }],
        },
      } as ModelPackage)).toEqual([1, 2, 3, 4]);
    });

    it('returns graph model input shape if it is a layers model', () => {
      vi.mocked(isLayersModel.isLayersModel).mockImplementation(() => false);
      expect(getModelInputShape(tfn, {
        model: {
          inputs: [{
            shape: [1, 2, 3, 4],
          }],
        }
      } as ModelPackage)).toEqual([1, 2, 3, 4]);
    });

    it('throws if a model returns a non rank 4 shape', () => {
      vi.mocked(isShape4D).mockImplementation(() => false);
      vi.mocked(isLayersModel.isLayersModel).mockImplementation(() => true);
      expect(() => getModelInputShape(tfn, {
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
});
