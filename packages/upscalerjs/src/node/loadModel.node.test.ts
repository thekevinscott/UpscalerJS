import {
  loadModel,
  getModelPath,
  getModuleFolder,
  getMissingMatchesError,
} from "./loadModel.node.js";
import { vi } from 'vitest';
import path from 'path';
import { resolver, } from './resolver.js';
import {
  ModelDefinition,
} from "../../../shared/src/types.js";
import * as tf from '@tensorflow/tfjs-node';
import {
  ERROR_MODEL_DEFINITION_BUG,
} from '../core/errors-and-warnings.js';
import {
  loadTfModel,
} from '../core/model-utils.js';
import {
  checkModelDefinition,
} from '../core/utils.js';

import type * as sharedUtils from '../core/utils.js';
import type * as modelUtils from '../core/model-utils.js';
import type * as errorsAndWarnings from '../core/errors-and-warnings.js';
import type * as resolverModule from './resolver.js';

vi.mock('../core/model-utils.js', async () => {
  const { loadTfModel, ...rest } = await vi.importActual('../core/model-utils.js') as typeof modelUtils;
  return {
    ...rest,
    loadTfModel: vi.fn(),
  }
});

vi.mock('../core/errors-and-warnings.js', async () => {
  const { ...rest } = await vi.importActual('../core/errors-and-warnings.js') as typeof errorsAndWarnings;
  return {
    ...rest,
  }
});

vi.mock('../core/utils.js', async () => {
  const { checkModelDefinition, ...rest } = await vi.importActual('../core/utils.js') as typeof sharedUtils;
  return {
    ...rest,
    checkModelDefinition: vi.fn(checkModelDefinition),
  }
});
vi.mock('./resolver.js', async () => {
  const { resolver, ...rest } = await vi.importActual('./resolver.js') as typeof resolverModule;
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
      vi.mocked(resolver).mockImplementation(getResolver(() => './node_modules/@upscalerjs/default-model/dist/foo/foo.ts.js'));
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
      vi.mocked(resolver).mockImplementation(getResolver(() => './node_modules/@upscalerjs/default-model/dist/foo/foo.ts.js'));
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
    it('throws if given a bad model definition', async () => {
      vi.mocked(resolver).mockImplementation(getResolver(() => './node_modules/baz.js'));
      const error = ERROR_MODEL_DEFINITION_BUG;
      vi.mocked(checkModelDefinition).mockImplementation(() => {
        throw new Error();
      });

      await expect(loadModel(tf, Promise.resolve({}) as Promise<ModelDefinition>))
        .rejects
        .toThrow();
    });

    it('loads a valid layers model', async () => {
      vi.mocked(resolver).mockImplementation(getResolver(() => './node_modules/baz.js'));
      vi.mocked(checkModelDefinition).mockImplementation(() => true);
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
      vi.mocked(resolver).mockImplementation(getResolver(() => './node_modules/baz.js'));
      vi.mocked(checkModelDefinition).mockImplementation(() => true);
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
