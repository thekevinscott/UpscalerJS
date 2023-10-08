import { 
  loadModel,
  getModelPath,
  getModuleFolder,
  getMissingMatchesError,
} from "./loadModel.node";
import { vi } from 'vitest';
import path from 'path';
import { resolver, } from './resolver';
import {
  ModelDefinition,
  MODEL_DEFINITION_VALIDATION_CHECK_ERROR_TYPE,
} from "../../../shared/src/types";
import * as tf from '@tensorflow/tfjs-node';
import {
  ERROR_MODEL_DEFINITION_BUG,
} from '../shared/errors-and-warnings';
import {
  loadTfModel,
} from '../shared/model-utils';
import {
  isValidModelDefinition,
  ModelDefinitionValidationError,
} from '../../../shared/src/constants';

import type * as sharedConstants from '../../../shared/src/constants';
import type * as modelUtils from '../shared/model-utils';
import type * as errorsAndWarnings from '../shared/errors-and-warnings';
import type * as resolverModule from './resolver';

vi.mock('../shared/model-utils', async () => {
  const { loadTfModel, ...rest } = await vi.importActual('../shared/model-utils') as typeof modelUtils;
  return {
    ...rest,
    loadTfModel: vi.fn(),
  }
});

vi.mock('../shared/errors-and-warnings', async () => {
  const { getModelDefinitionError, ...rest } = await vi.importActual('../shared/errors-and-warnings') as typeof errorsAndWarnings;
  return {
    ...rest,
    getModelDefinitionError: vi.fn(getModelDefinitionError),
  }
});

vi.mock('../../../shared/src/constants', async () => {
  const { isValidModelDefinition, ...rest } = await vi.importActual('../../../shared/src/constants') as typeof sharedConstants;
  return {
    ...rest,
    isValidModelDefinition: vi.fn(isValidModelDefinition),
  }
});
vi.mock('./resolver', async () => {
  const { resolver, ...rest } = await vi.importActual('./resolver') as typeof resolverModule;
  return {
    ...rest,
    resolver: vi.fn(resolver),
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

      await expect(loadModel(tf, Promise.resolve({}) as Promise<ModelDefinition>))
        .rejects
        .toThrow(error);
    });

    it('loads a valid layers model', async () => {
      vi.mocked(resolver).mockImplementation(getResolver(() => './node_modules/baz'));
      vi.mocked(isValidModelDefinition).mockImplementation(() => true);
      vi.mocked(loadTfModel).mockImplementation(async () => 'layers model' as any);

      const path = 'foo';
      const modelDefinition: ModelDefinition = { path, scale: 2, modelType: 'layers' };

      const response = await loadModel(tf, Promise.resolve(modelDefinition));
      expect(loadTfModel).toHaveBeenCalledWith(tf, path, 'layers');
      expect(response).toEqual({
        model: 'layers model',
        modelDefinition,
      })
    });

    it('loads a valid graph model', async () => {
      vi.mocked(resolver).mockImplementation(getResolver(() => './node_modules/baz'));
      vi.mocked(isValidModelDefinition).mockImplementation(() => true);
      vi.mocked(loadTfModel).mockImplementation(async () => 'graph model' as any);

      const path = 'foo';
      const modelDefinition: ModelDefinition = { path, scale: 2, modelType: 'graph' };

      const response = await loadModel(tf, Promise.resolve(modelDefinition));
      expect(loadTfModel).toHaveBeenCalledWith(tf, path, 'graph');
      expect(response).toEqual({
        model: 'graph model',
        modelDefinition,
      })
    });
  });
});
