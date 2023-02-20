import type { GraphModel, io, LayersModel } from '@tensorflow/tfjs';
import { ModelDefinition } from '@upscalerjs/core';
import { tf as _tf, } from './dependencies.generated';
import { mock, mockFn } from '../../../test/lib/shared/mockers';
import {
  CDNS,
  CDN_PATH_DEFINITIONS,
  fetchModel,
  getLoadModelErrorMessage,
  loadModel,
} from './loadModel.browser';
import {
  getModelDefinitionError as _getModelDefinitionError,
  loadTfModel as _loadTfModel,
  ERROR_MODEL_DEFINITION_BUG,
} from './utils';

import {
  isValidModelDefinition as _isValidModelDefinition,
  ModelDefinitionValidationError,
  MODEL_DEFINITION_VALIDATION_CHECK_ERROR_TYPE,
} from '@upscalerjs/core';

jest.mock('./loadModel.browser', () => {
  const { ...rest } = jest.requireActual('./loadModel.browser');
  return {
    ...rest,
  }
});

jest.mock('./utils', () => {
  const { loadTfModel, getModelDefinitionError, ...rest } = jest.requireActual('./utils');
  return {
    ...rest,
    getModelDefinitionError: jest.fn(getModelDefinitionError),
    loadTfModel: jest.fn(loadTfModel),
  }
});

jest.mock('@upscalerjs/core', () => {
  const { isValidModelDefinition, ...rest } = jest.requireActual('@upscalerjs/core');
  return {
    ...rest,
    isValidModelDefinition: jest.fn(isValidModelDefinition),
  }
});

jest.mock('./dependencies.generated', () => {
  const { tf, ...rest } = jest.requireActual('./dependencies.generated');
  return {
    ...rest,
    tf: {
      ...tf,
      loadLayersModel: jest.fn(),
      loadGraphModel: jest.fn(),
    }
  }
});

const tf = mock(_tf);
const getModelDefinitionError = mockFn(_getModelDefinitionError);
const isValidModelDefinition = mockFn(_isValidModelDefinition);
const loadTfModel = mockFn(_loadTfModel);

describe('loadModel browser tests', () => {
  beforeEach(() => {
    getModelDefinitionError.mockClear();
    isValidModelDefinition.mockClear();
    loadTfModel.mockClear();
    tf.loadLayersModel.mockClear();
    tf.loadGraphModel.mockClear();
  });

  describe('fetchModel', () => {
    describe('No package info', () => {
      it('loads the given model path if there is no package info', async () => {
        expect(loadTfModel).toBeCalledTimes(0);
        await fetchModel({
          path: 'foo',
          modelType: 'layers',
        } as ModelDefinition);
        expect(loadTfModel).toBeCalledTimes(1);
        expect(loadTfModel).toBeCalledWith('foo', undefined);
      });

      it('loads the given model path as a graph model if there is no package info', async () => {
        expect(loadTfModel).toBeCalledTimes(0);
        await fetchModel({
          path: 'foo',
          modelType: 'graph'
        } as ModelDefinition);
        expect(loadTfModel).toBeCalledTimes(1);
        expect(loadTfModel).toBeCalledWith('foo', 'graph');
      });
    });

    describe('Package info', () => {
      it('attempts to load a model from a CDN if given package information', async () => {
        const packageName = 'packageName';
        const version = 'version';
        const modelPath = 'modelPath';
        expect(loadTfModel).toBeCalledTimes(0);
        await fetchModel({
          path: modelPath,
          packageInformation: {
            name: packageName,
            version,
          },
          modelType: 'layers',
        } as ModelDefinition);
        expect(loadTfModel).toBeCalledTimes(1);
        expect(loadTfModel).toBeCalledWith(CDN_PATH_DEFINITIONS[CDNS[0]](packageName, version, modelPath), undefined);
      });

      it('attempts to load a graph model from a CDN if given package information', async () => {
        const packageName = 'packageName';
        const version = 'version';
        const modelPath = 'modelPath';
        expect(loadTfModel).toBeCalledTimes(0);
        await fetchModel({
          path: modelPath,
          packageInformation: {
            name: packageName,
            version,
          },
          modelType: 'graph',
        } as ModelDefinition);
        expect(loadTfModel).toBeCalledTimes(1);
        expect(loadTfModel).toBeCalledWith(CDN_PATH_DEFINITIONS[CDNS[0]](packageName, version, modelPath), 'graph');
      });

      it('attempts to load a model from a subsequent CDN if a prior one fails', async () => {
        const packageName = 'packageName';
        const version = 'version';
        const modelPath = 'modelPath';
        loadTfModel.mockImplementation(async (url: string | io.IOHandler) => {
          if (url === CDN_PATH_DEFINITIONS[CDNS[0]](packageName, version, modelPath)) {
            throw new Error('next');
          }
          return 'foo' as unknown as LayersModel;
        });
        expect(loadTfModel).toBeCalledTimes(0);
        await fetchModel({
          path: modelPath,
          packageInformation: {
            name: packageName,
            version,
          },
          modelType: 'layers',
        } as ModelDefinition);
        expect(loadTfModel).toBeCalledTimes(2);
        expect(loadTfModel).toBeCalledWith(CDN_PATH_DEFINITIONS[CDNS[1]](packageName, version, modelPath), undefined);
      });

      it('throws if all attempts to fetch a model fail', async () => {
        const packageName = 'packageName';
        const version = 'version';
        const modelPath = 'modelPath';
        let i = 0;
        loadTfModel.mockImplementation(async () => {
          throw new Error(`next: ${i++}`);
        });
        await expect(() => fetchModel({
          path: modelPath,
          packageInformation: {
            name: packageName,
            version,
          },
          modelType: 'layers',
        } as ModelDefinition))
          .rejects
          .toThrowError(getLoadModelErrorMessage(modelPath, {
            name: packageName,
            version,
          }, CDNS.map((cdn, i) => [cdn, new Error(`next: ${i}`)])));
      });
    });
  });

  describe('loadModel', () => {
    it('throws if not a valid model definition', async () => {
      const e = new Error(ERROR_MODEL_DEFINITION_BUG);
      isValidModelDefinition.mockImplementation(() => {
        throw new ModelDefinitionValidationError(MODEL_DEFINITION_VALIDATION_CHECK_ERROR_TYPE.UNDEFINED);
      });
      getModelDefinitionError.mockImplementation(() => e);

      await expect(() => loadModel({
        path: 'foo',
        scale: 2,
      })).rejects.toThrowError(e);
    });

    it('loads a valid layers model successfully', async () => {
      isValidModelDefinition.mockImplementation(() => true);
      const model = 'foo' as unknown as LayersModel;
      loadTfModel.mockImplementation(async () => model);
      expect(loadTfModel).toHaveBeenCalledTimes(0);

      const modelDefinition: ModelDefinition = {
        path: 'foo',
        scale: 2,
        modelType: 'layers',
      };

      const result = await loadModel(modelDefinition);

      expect(loadTfModel).toHaveBeenCalledTimes(1);
      expect(loadTfModel).toHaveBeenCalledWith(modelDefinition.path, 'layers');

      expect(result).toStrictEqual({
        modelDefinition,
        model,
      });
    });

    it('loads a valid graph model successfully', async () => {
      isValidModelDefinition.mockImplementation(() => true);
      const model = 'foo' as unknown as GraphModel;
      tf.loadLayersModel.mockImplementation(async () => 'layers model' as any);
      tf.loadGraphModel.mockImplementation(async () => model);
      expect(tf.loadLayersModel).toHaveBeenCalledTimes(0);

      const modelDefinition: ModelDefinition = {
        path: 'foo',
        scale: 2,
        modelType: 'graph',
      };

      const result = await loadModel(modelDefinition);

      expect(loadTfModel).toHaveBeenCalledTimes(1);
      expect(loadTfModel).toHaveBeenCalledWith(modelDefinition.path, 'graph');

      expect(result).toStrictEqual({
        modelDefinition,
        model,
      });
    });
  });
});
