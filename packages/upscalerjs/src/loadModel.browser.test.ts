import type { io, LayersModel } from '@tensorflow/tfjs';
import { ModelDefinition } from '@upscalerjs/core';
import { tf as _tf, } from './dependencies.generated';
import { mock, mockFn } from '../../../test/lib/shared/mockers';
import {
  CDNS,
  fetchModel,
  getLoadModelErrorMessage,
  loadModel,
} from './loadModel.browser';
import {
  registerCustomLayers as _registerCustomLayers,
  isValidModelDefinition as _isValidModelDefinition,
  getModelDefinitionError as _getModelDefinitionError,
} from './utils';

jest.mock('./loadModel.browser', () => {
  const { ...rest } = jest.requireActual('./loadModel.browser');
  return {
    ...rest,
  }
});

jest.mock('./utils', () => {
  const { getModelDefinitionError, isValidModelDefinition, registerCustomLayers, ...rest } = jest.requireActual('./utils');
  return {
    ...rest,
    registerCustomLayers: jest.fn(registerCustomLayers),
    isValidModelDefinition: jest.fn(isValidModelDefinition),
    getModelDefinitionError: jest.fn(getModelDefinitionError),
  }
});

jest.mock('./dependencies.generated', () => {
  const { tf, ...rest } = jest.requireActual('./dependencies.generated');
  return {
    ...rest,
    tf: {
      ...tf,
      loadLayersModel: jest.fn(),
    }
  }
});

const tf = mock(_tf);
const getModelDefinitionError = mockFn(_getModelDefinitionError);
const isValidModelDefinition = mockFn(_isValidModelDefinition);
const registerCustomLayers = mockFn(_registerCustomLayers);

describe('loadModel browser tests', () => {
  beforeEach(() => {
    registerCustomLayers.mockClear();
    getModelDefinitionError.mockClear();
    isValidModelDefinition.mockClear();
    tf.loadLayersModel.mockClear();
  });

  describe('fetchModel', () => {
    it('loads the given model path if there is no package info', async () => {
      expect(tf.loadLayersModel).toBeCalledTimes(0);
      await fetchModel('foo');
      expect(tf.loadLayersModel).toBeCalledTimes(1);
      expect(tf.loadLayersModel).toBeCalledWith('foo');
    });

    it('attempts to load a model from a CDN if given package information', async () => {
      const packageName = 'packageName';
      const version = 'version';
      const modelPath = 'modelPath';
      expect(tf.loadLayersModel).toBeCalledTimes(0);
      await fetchModel(modelPath, {
        name: packageName,
        version,
      });
      expect(tf.loadLayersModel).toBeCalledTimes(1);
      expect(tf.loadLayersModel).toBeCalledWith(CDNS[0].fn(packageName, version, modelPath));
    });

    it('attempts to load a model from a subsequent CDN if a prior one fails', async () => {
      const packageName = 'packageName';
      const version = 'version';
      const modelPath = 'modelPath';
      tf.loadLayersModel.mockImplementation(async (url: string | io.IOHandler) => {
        if (url === CDNS[0].fn(packageName, version, modelPath)) {
          throw new Error('next');
        }
        return 'foo' as unknown as LayersModel;
      });
      expect(tf.loadLayersModel).toBeCalledTimes(0);
      await fetchModel(modelPath, {
        name: packageName,
        version,
      });
      expect(tf.loadLayersModel).toBeCalledTimes(2);
      expect(tf.loadLayersModel).toBeCalledWith(CDNS[1].fn(packageName, version, modelPath));
    });

    it('throws if all attempts to fetch a model fail', async () => {
      const packageName = 'packageName';
      const version = 'version';
      const modelPath = 'modelPath';
      tf.loadLayersModel.mockImplementation(async () => {
        throw new Error('next');
      });
      await expect(() => fetchModel(modelPath, {
        name: packageName,
        version,
      }))
        .rejects
        .toThrowError(getLoadModelErrorMessage(modelPath));
    });
  });

  describe('loadModel', () => {
    it('throws if not a valid model definition', async () => {
      const e = new Error('foo');
      isValidModelDefinition.mockImplementation(() => false);
      getModelDefinitionError.mockImplementation(() => e);

      await expect(() => loadModel({
        path: 'foo',
        scale: 2,
      })).rejects.toThrowError(e);
    });

    it('loads a model successfully', async () => {
      isValidModelDefinition.mockImplementation(() => true);
      const model = 'foo' as unknown as LayersModel;
      tf.loadLayersModel.mockImplementation(async () => model);
      expect(tf.loadLayersModel).toHaveBeenCalledTimes(0);
      expect(registerCustomLayers).toHaveBeenCalledTimes(0);

      const modelDefinition: ModelDefinition = {
        path: 'foo',
        scale: 2,
      };

      const result = await loadModel(modelDefinition);

      expect(tf.loadLayersModel).toHaveBeenCalledTimes(1);
      expect(tf.loadLayersModel).toHaveBeenCalledWith(modelDefinition.path);
      expect(registerCustomLayers).toHaveBeenCalledTimes(1);
      expect(registerCustomLayers).toHaveBeenCalledWith(modelDefinition);

      expect(result).toStrictEqual({
        modelDefinition,
        model,
      });
    });
  });
});
