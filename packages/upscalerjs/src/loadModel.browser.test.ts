import type { io, LayersModel } from '@tensorflow/tfjs';
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
  registerCustomLayers as _registerCustomLayers,
  getModelDefinitionError as _getModelDefinitionError,
} from './utils';

import {
  isValidModelDefinition as _isValidModelDefinition,
} from '@upscalerjs/core';

jest.mock('./loadModel.browser', () => {
  const { ...rest } = jest.requireActual('./loadModel.browser');
  return {
    ...rest,
  }
});

jest.mock('./utils', () => {
  const { getModelDefinitionError, registerCustomLayers, ...rest } = jest.requireActual('./utils');
  return {
    ...rest,
    registerCustomLayers: jest.fn(registerCustomLayers),
    getModelDefinitionError: jest.fn(getModelDefinitionError),
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
      expect(tf.loadLayersModel).toBeCalledWith(CDN_PATH_DEFINITIONS[CDNS[0]](packageName, version, modelPath));
    });

    it('attempts to load a model from a subsequent CDN if a prior one fails', async () => {
      const packageName = 'packageName';
      const version = 'version';
      const modelPath = 'modelPath';
      tf.loadLayersModel.mockImplementation(async (url: string | io.IOHandler) => {
        if (url === CDN_PATH_DEFINITIONS[CDNS[0]](packageName, version, modelPath)) {
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
      expect(tf.loadLayersModel).toBeCalledWith(CDN_PATH_DEFINITIONS[CDNS[1]](packageName, version, modelPath));
    });

    it('throws if all attempts to fetch a model fail', async () => {
      const packageName = 'packageName';
      const version = 'version';
      const modelPath = 'modelPath';
      let i = 0;
      tf.loadLayersModel.mockImplementation(async () => {
        throw new Error(`next: ${i++}`);
      });
      await expect(() => fetchModel(modelPath, {
        name: packageName,
        version,
      }))
        .rejects
        .toThrowError(getLoadModelErrorMessage(modelPath, {
          name: packageName,
          version,
        }, CDNS.map((cdn, i) => [cdn, new Error(`next: ${i}`)])));
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
