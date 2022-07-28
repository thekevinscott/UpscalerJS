import { 
  loadModel,
  getModelPath,
  getModuleFolder,
  getMissingMatchesError,
} from "./loadModel.node";
import { mock, mockFn } from '../../../test/lib/shared/mockers';
import { tf as _tf, } from './dependencies.generated';
import path from 'path';
import { resolver as _resolver } from './resolver';
import type { ModelDefinition } from "@upscalerjs/core";
import {
  isValidModelDefinition as _isValidModelDefinition,
  getModelDefinitionError as _getModelDefinitionError,
  registerCustomLayers as _registerCustomLayers,
} from './utils';
jest.mock('./utils', () => {
  const { getModuleFolder, getModelDefinitionError, isValidModelDefinition, registerCustomLayers, ...rest } = jest.requireActual('./utils');
  return {
    ...rest,
    registerCustomLayers: jest.fn(registerCustomLayers),
    isValidModelDefinition: jest.fn(isValidModelDefinition),
    getModelDefinitionError: jest.fn(getModelDefinitionError),
    getModuleFolder: jest.fn(getModuleFolder),
  }
});
jest.mock('./resolver', () => {
  const { resolver, ...rest } = jest.requireActual('./resolver');
  return {
    ...rest,
    resolver: jest.fn(resolver),
  };
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
const resolver = mockFn(_resolver);
const getModelDefinitionError = mockFn(_getModelDefinitionError);
const isValidModelDefinition = mockFn(_isValidModelDefinition);
const registerCustomLayers = mockFn(_registerCustomLayers);

const getResolver = (fn: () => string) => (fn) as unknown as typeof require.resolve;

describe('loadModel.node', () => {
  beforeEach(() => {
    getModelDefinitionError.mockClear();
    isValidModelDefinition.mockClear();
    registerCustomLayers.mockClear();
    resolver.mockClear();
    tf.loadLayersModel.mockClear();
  });

  describe('getModuleFolder', () => {
    it('returns undefined if a module cannot be found', () => {
      resolver.mockImplementation(getResolver(() => 'foo'));
      expect(() => getModuleFolder('foo')).toThrowError(getMissingMatchesError('foo'));
    });

    it('returns the path to the module', () => {
      resolver.mockImplementation(getResolver(() => './node_modules/@upscalerjs/esrgan-slim/dist/foo/foo.ts'));
      expect(getModuleFolder('baz')).toEqual('./node_modules/@upscalerjs/esrgan-slim/');
    });

    it('returns the path to the module even if it is local', () => {
      resolver.mockImplementation(getResolver(() => '/Users/foo/@upscalerjs/esrgan-slim/dist/foo/foo.ts'));
      expect(getModuleFolder('baz')).toEqual('/Users/foo/@upscalerjs/esrgan-slim/');
    });

    it('returns the path to the module even if the name is different', () => {
      resolver.mockImplementation(getResolver(() => '/dist/Users/foo/baz/dist/foo/foo.ts'));
      expect(getModuleFolder('baz')).toEqual('/dist/Users/foo/baz/');
    });
  });

  describe('getModelPath', () => {
    it('returns model path if given no package information', () => {
      resolver.mockImplementation(getResolver(() => ''));
      expect(getModelPath({ path: 'foo', scale: 2 })).toEqual('foo');
    });

    it('returns model path if given package information', () => {
      resolver.mockImplementation(getResolver(() => './node_modules/@upscalerjs/esrgan-slim/dist/foo/foo.ts'));
      expect(getModelPath({
        packageInformation: {
          name: 'baz',
          version: '1.0.0',
        }, path: 'some-model', scale: 2
      })).toEqual(`file://${path.resolve('./node_modules/@upscalerjs/esrgan-slim', 'some-model')}`);
    });
  });

  describe('loadModel', () => {
    it('throws if given an undefined model definition', async () => {
      resolver.mockImplementation(getResolver(() => './node_modules/baz'));
      const error = 'some error';
      getModelDefinitionError.mockImplementation(() => new Error(error))
      isValidModelDefinition.mockImplementation(() => false);

      await expect(loadModel({} as ModelDefinition))
        .rejects
        .toThrow(error);
    });

    it('loads a valid model', async () => {
      resolver.mockImplementation(getResolver(() => './node_modules/baz'));
      isValidModelDefinition.mockImplementation(() => true);
      registerCustomLayers.mockImplementation(() => { });
      tf.loadLayersModel.mockImplementation(async () => 'layers model' as any);

      const path = 'foo';
      const modelDefinition: ModelDefinition = { path, scale: 2 };

      const response = await loadModel(modelDefinition);
      expect(registerCustomLayers).toHaveBeenCalledTimes(1);
      expect(tf.loadLayersModel).toHaveBeenCalledWith(path);
      expect(response).toEqual({
        model: 'layers model',
        modelDefinition,
      })
    });
  });
});
