import { 
  loadModel,
  getModelPath,
  getModuleFolder,
  getMissingMatchesError,
} from "./loadModel.node";
import { vi, } from 'vitest';
import path from 'path';
import { resolver, } from './resolver';
import type { ModelDefinition, } from "@upscalerjs/core";
import {
  ERROR_MODEL_DEFINITION_BUG,
} from './errors-and-warnings';
import {
  loadTfModel,
} from './model-utils';
import {
  isValidModelDefinition,
  ModelDefinitionValidationError,
  MODEL_DEFINITION_VALIDATION_CHECK_ERROR_TYPE,
} from '@upscalerjs/core';

import type * as dependenciesGenerated from './dependencies.generated';
import type * as core from '@upscalerjs/core';
import type * as modelUtils from './model-utils';
import type * as errorsAndWarnings from './errors-and-warnings';
import type * as resolverModule from './resolver';

vi.mock('./model-utils', async () => {
  const _modelUtils = await vi.importActual('./model-utils');
  const { loadTfModel, ...rest } = _modelUtils as typeof modelUtils;
  return {
    ...rest,
    loadTfModel: vi.fn(loadTfModel),
  };
});

vi.mock('./errors-and-warnings', async () => {
  const _import = await vi.importActual('./errors-and-warnings');
  const { getModelDefinitionError, ...rest } = _import as typeof errorsAndWarnings;
  return {
    ...rest,
    getModelDefinitionError: vi.fn(getModelDefinitionError),
  };
});

vi.mock('@upscalerjs/core', async () => {
  const _import = await vi.importActual('@upscalerjs/core');
  const { isValidModelDefinition, ...rest } = _import as typeof core;
  return {
    ...rest,
    isValidModelDefinition: vi.fn(isValidModelDefinition),
  };
});
vi.mock('./resolver', async () => {
  const _import = await vi.importActual('./resolver');
  const { resolver, ...rest } = _import as typeof resolverModule;
  return {
    ...rest,
    resolver: vi.fn(resolver),
  };
});
vi.mock('./dependencies.generated', async () => {
  const _import = await vi.importActual('./dependencies.generated');
  const { tf, ...rest } = _import as typeof dependenciesGenerated;
  return {
    ...rest,
    tf: {
      ...tf,
      loadLayersModel: vi.fn(),
      loadGraphModel: vi.fn(),
    },
  };
});

const getResolver = (fn: () => string) => (fn) as unknown as typeof require.resolve;

describe('loadModel.node', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getModuleFolder', () => {
    it('returns undefined if a module cannot be found', () => {
      vi.mocked(resolver).mockImplementation(getResolver(() => 'foo'));
      expect(() => getModuleFolder('foo')).toThrowError(getMissingMatchesError('foo'));
    });

    it('returns the path to the module', () => {
      vi.mocked(resolver).mockImplementation(getResolver(() => './node_modules/@upscalerjs/default-model/dist/foo/foo.ts'));
      expect(getModuleFolder('baz')).toEqual('./node_modules/@upscalerjs/default-model/');
    });

    it('returns the path to the module even if it is local', () => {
      vi.mocked(resolver).mockImplementation(getResolver(() => '/Users/foo/@upscalerjs/default-model/dist/foo/foo.ts'));
      expect(getModuleFolder('baz')).toEqual('/Users/foo/@upscalerjs/default-model/');
    });

    it('returns the path to the module even if the name is different', () => {
      vi.mocked(resolver).mockImplementation(getResolver(() => '/dist/Users/foo/baz/dist/foo/foo.ts'));
      expect(getModuleFolder('baz')).toEqual('/dist/Users/foo/baz/');
    });
  });

  describe('getModelPath', () => {
    it('returns model path if provided a path', () => {
      vi.mocked(resolver).mockImplementation(getResolver(() => ''));
      expect(getModelPath({ 
        path: 'foo', 
        _internals: {
          path: 'some-model',
          name: 'baz',
          version: '1.0.0',
        },
        scale: 2,
        modelType: 'layers',
       })).toEqual('foo');
    });

    it('returns model path if not provided a path', () => {
      vi.mocked(resolver).mockImplementation(getResolver(() => './node_modules/@upscalerjs/default-model/dist/foo/foo.ts'));
      expect(getModelPath({
        _internals: {
          path: 'some-model',
          name: 'baz',
          version: '1.0.0',
        },
        scale: 2,
        modelType: 'layers',
      })).toEqual(`file://${path.resolve('./node_modules/@upscalerjs/default-model', 'some-model')}`);
    });
  });

  describe('loadModel', () => {
    it('throws if given an undefined model definition', async () => {
      vi.mocked(resolver).mockImplementation(getResolver(() => './node_modules/baz'));
      const error = ERROR_MODEL_DEFINITION_BUG;
      vi.mocked(isValidModelDefinition).mockImplementation(() => {
        throw new ModelDefinitionValidationError(MODEL_DEFINITION_VALIDATION_CHECK_ERROR_TYPE.UNDEFINED);
      });

      await expect(loadModel(Promise.resolve({}) as Promise<ModelDefinition>))
        .rejects
        .toThrow(error);
    });

    it('loads a valid layers model', async () => {
      vi.mocked(resolver).mockImplementation(getResolver(() => './node_modules/baz'));
      vi.mocked(isValidModelDefinition).mockImplementation(() => true);
      vi.mocked(loadTfModel).mockResolvedValue('layers model');

      const path = 'foo';
      const modelDefinition: ModelDefinition = { path, scale: 2, modelType: 'layers', };

      const response = await loadModel(Promise.resolve(modelDefinition));
      expect(loadTfModel).toHaveBeenCalledWith(path, 'layers');
      expect(response).toEqual({
        model: 'layers model',
        modelDefinition,
      });
    });

    it('loads a valid graph model', async () => {
      vi.mocked(resolver).mockImplementation(getResolver(() => './node_modules/baz'));
      vi.mocked(isValidModelDefinition).mockImplementation(() => true);
      vi.mocked(loadTfModel).mockResolvedValue('graph model');

      const path = 'foo';
      const modelDefinition: ModelDefinition = { path, scale: 2, modelType: 'graph', };

      const response = await loadModel(Promise.resolve(modelDefinition));
      expect(loadTfModel).toHaveBeenCalledWith(path, 'graph');
      expect(response).toEqual({
        model: 'graph model',
        modelDefinition,
      });
    });
  });
});
