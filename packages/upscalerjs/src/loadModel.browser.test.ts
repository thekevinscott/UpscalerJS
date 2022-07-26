import type { io } from '@tensorflow/tfjs';
import type { LayersModel } from '@tensorflow/tfjs';
import { ModelDefinition } from '@upscalerjs/core';
import { tf, } from './dependencies.generated';
import {
  CDNS,
  fetchModel,
  getLoadModelErrorMessage,
  loadModel,
} from './loadModel.browser';
import * as utils from './utils';

jest.mock('./loadModel.browser', () => ({
  ...jest.requireActual('./loadModel.browser'),
}));

jest.mock('./utils', () => ({
  ...jest.requireActual('./utils'),
  registerCustomLayers: jest.fn(),
  isValidModelDefinition: jest.fn(),
  getModelDefinitionError: jest.fn(),
}));

jest.mock('./dependencies.generated', () => {
  const dependencies = jest.requireActual('./dependencies.generated');
  return {
    ...dependencies,
    tf: {
      ...dependencies.tf,
      loadLayersModel: jest.fn(),
    }
  }
});

const mockedUtils = utils as jest.Mocked<typeof utils>;
const mockedTf = tf as jest.Mocked<typeof tf>;

describe('loadModel browser tests', () => {
  beforeEach(() => {
    mockedTf.loadLayersModel.mockClear();
    mockedUtils.isValidModelDefinition.mockClear();
    mockedUtils.getModelDefinitionError.mockClear();
    mockedUtils.registerCustomLayers.mockClear();
  });

  describe('fetchModel', () => {
    it('loads the given model path if there is no package info', async () => {
      expect(mockedTf.loadLayersModel).toBeCalledTimes(0);
      await fetchModel('foo');
      expect(mockedTf.loadLayersModel).toBeCalledTimes(1);
      expect(mockedTf.loadLayersModel).toBeCalledWith('foo');
    });

    it('attempts to load a model from a CDN if given package information', async () => {
      const packageName = 'packageName';
      const version = 'version';
      const modelPath = 'modelPath';
      expect(mockedTf.loadLayersModel).toBeCalledTimes(0);
      await fetchModel(modelPath, {
        name: packageName,
        version,
      });
      expect(mockedTf.loadLayersModel).toBeCalledTimes(1);
      expect(mockedTf.loadLayersModel).toBeCalledWith(CDNS[0].fn(packageName, version, modelPath));
    });

    it('attempts to load a model from a subsequent CDN if a prior one fails', async () => {
      const packageName = 'packageName';
      const version = 'version';
      const modelPath = 'modelPath';
      mockedTf.loadLayersModel.mockImplementation(async (url: string | io.IOHandler) => {
        if (url === CDNS[0].fn(packageName, version, modelPath)) {
          throw new Error('next');
        }
        return 'foo' as unknown as LayersModel;
      });
      expect(mockedTf.loadLayersModel).toBeCalledTimes(0);
      await fetchModel(modelPath, {
        name: packageName,
        version,
      });
      expect(mockedTf.loadLayersModel).toBeCalledTimes(2);
      expect(mockedTf.loadLayersModel).toBeCalledWith(CDNS[1].fn(packageName, version, modelPath));
    });

    it('throws if all attempts to fetch a model fail', async () => {
      const packageName = 'packageName';
      const version = 'version';
      const modelPath = 'modelPath';
      mockedTf.loadLayersModel.mockImplementation(async () => {
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
      mockedUtils.isValidModelDefinition.mockImplementation(() => false);
      mockedUtils.getModelDefinitionError.mockImplementation(() => e);

      await expect(() => loadModel({
        path: 'foo',
        scale: 2,
      })).rejects.toThrowError(e);
    });

    it('loads a model successfully', async () => {
      mockedUtils.isValidModelDefinition.mockImplementation(() => true);
      const model = 'foo' as unknown as LayersModel;
      mockedTf.loadLayersModel.mockImplementation(async () => model);
      expect(mockedTf.loadLayersModel).toHaveBeenCalledTimes(0);
      expect(mockedUtils.registerCustomLayers).toHaveBeenCalledTimes(0);

      const modelDefinition: ModelDefinition = {
        path: 'foo',
        scale: 2,
      };

      const result = await loadModel(modelDefinition);

      expect(mockedTf.loadLayersModel).toHaveBeenCalledTimes(1);
      expect(mockedTf.loadLayersModel).toHaveBeenCalledWith(modelDefinition.path);
      expect(mockedUtils.registerCustomLayers).toHaveBeenCalledTimes(1);
      expect(mockedUtils.registerCustomLayers).toHaveBeenCalledWith(modelDefinition);

      expect(result).toStrictEqual({
        modelDefinition,
        model,
      });
    });
  });
});
