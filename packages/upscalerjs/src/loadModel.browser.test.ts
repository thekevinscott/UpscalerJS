import type { GraphModel, io, LayersModel } from '@tensorflow/tfjs';
import { vi } from 'vitest';
import { tf } from './dependencies.generated';
import {
  CDNS,
  CDN_PATH_DEFINITIONS,
  fetchModel,
  getLoadModelErrorMessage,
  loadModel,
} from './loadModel.browser';
import {
  loadTfModel,
} from './model-utils';

import {
  getModelDefinitionError,
  ERROR_MODEL_DEFINITION_BUG,
} from './errors-and-warnings';

import {
  ModelDefinition,
  isValidModelDefinition,
  ModelDefinitionValidationError,
  MODEL_DEFINITION_VALIDATION_CHECK_ERROR_TYPE,
} from '@upscalerjs/core';

import type * as dependenciesGenerated from './dependencies.generated';
import type * as core from '@upscalerjs/core';
import type * as modelUtils from './model-utils';
import type * as errorsAndWarnings from './errors-and-warnings';
import type * as loadModelBrowser from './loadModel.browser';

vi.mock('./loadModel.browser', async () => {
  const { ...rest } = await vi.importActual('./loadModel.browser') as typeof loadModelBrowser;
  return {
    ...rest,
  }
});

vi.mock('./model-utils', async () => {
  const { loadTfModel, ...rest } = await vi.importActual('./model-utils') as typeof modelUtils;
  return {
    ...rest,
    loadTfModel: vi.fn(loadTfModel),
  }
});

vi.mock('./errors-and-warnings', async () => {
  const { getModelDefinitionError, ...rest } = await vi.importActual('./errors-and-warnings') as typeof errorsAndWarnings;
  return {
    ...rest,
    getModelDefinitionError: vi.fn(getModelDefinitionError),
  }
});

vi.mock('@upscalerjs/core', async () => {
  const { isValidModelDefinition, ...rest } = await vi.importActual('@upscalerjs/core') as typeof core;
  return {
    ...rest,
    isValidModelDefinition: vi.fn(isValidModelDefinition),
  }
});

vi.mock('./dependencies.generated', async () => {
  const { tf, ...rest } = await vi.importActual('./dependencies.generated') as typeof dependenciesGenerated;
  return {
    ...rest,
    tf: {
      ...tf,
      loadLayersModel: vi.fn(),
      loadGraphModel: vi.fn(),
    }
  }
});

describe('loadModel browser tests', () => {
  afterEach(() => {
    vi.clearAllMocks();
  })

  describe('fetchModel', () => {
    describe('Model configurations with explicit paths', () => {
      it('loads the given model path if path is provided', async () => {
        expect(loadTfModel).toBeCalledTimes(0);
        const modelDefinition: ModelDefinition = {
          path: 'foo',
          modelType: 'layers',
          _internals: {
            path: 'baz',
            name: 'packageName',
            version: 'version',
          },
        };
        await fetchModel(modelDefinition);
        expect(loadTfModel).toBeCalledTimes(1);
        expect(loadTfModel).toBeCalledWith('foo', 'layers');
      });

      it('loads the given model path as a graph model if path is provided', async () => {
        expect(loadTfModel).toBeCalledTimes(0);
        const modelDefinition: ModelDefinition = {
          path: 'foo',
          modelType: 'graph',
          _internals: {
            path: 'baz',
            name: 'packageName',
            version: 'version',
          },
        };
        await fetchModel(modelDefinition);
        expect(loadTfModel).toBeCalledTimes(1);
        expect(loadTfModel).toBeCalledWith('foo', 'graph');
      });

      it('loads the given model if _internals is not defined but path is', async () => {
        expect(loadTfModel).toBeCalledTimes(0);
        const modelDefinition: ModelDefinition = {
          path: 'foo',
          modelType: 'layers',
        };
        await fetchModel(modelDefinition);
        expect(loadTfModel).toBeCalledTimes(1);
        expect(loadTfModel).toBeCalledWith('foo', 'layers');
      });
    });

    describe('Model configurations without explicit paths', () => {
      it('attempts to load a model from a CDN if provided no custom path', async () => {
        const packageName = 'packageName';
        const version = 'version';
        const modelPath = 'modelPath';
        expect(loadTfModel).toBeCalledTimes(0);
        const modelDefinition: ModelDefinition = {
          _internals: {
            path: modelPath,
            name: packageName,
            version,
          },
          modelType: 'layers',
        };
        await fetchModel(modelDefinition);
        expect(loadTfModel).toBeCalledTimes(1);
        expect(loadTfModel).toBeCalledWith(CDN_PATH_DEFINITIONS[CDNS[0]](packageName, version, modelPath), 'layers');
      });

      it('attempts to load a graph model from a CDN if provided no custom path', async () => {
        const packageName = 'packageName';
        const version = 'version';
        const modelPath = 'modelPath';
        expect(loadTfModel).toBeCalledTimes(0);
        const modelDefinition: ModelDefinition = {
          _internals: {
            path: modelPath,
            name: packageName,
            version,
          },
          modelType: 'graph',
        };
        await fetchModel(modelDefinition);
        expect(loadTfModel).toBeCalledTimes(1);
        expect(loadTfModel).toBeCalledWith(CDN_PATH_DEFINITIONS[CDNS[0]](packageName, version, modelPath), 'graph');
      });

      it('attempts to load a model from a subsequent CDN if a prior one fails', async () => {
        const packageName = 'packageName';
        const version = 'version';
        const modelPath = 'modelPath';
        vi.mocked(loadTfModel).mockImplementation(async (url: string | io.IOHandler) => {
          if (url === CDN_PATH_DEFINITIONS[CDNS[0]](packageName, version, modelPath)) {
            throw new Error('next');
          }
          return 'foo' as unknown as LayersModel;
        });
        expect(loadTfModel).toBeCalledTimes(0);
        const modelDefinition: ModelDefinition = {
          _internals: {
            path: modelPath,
            name: packageName,
            version,
          },
          modelType: 'layers',
        };
        await fetchModel(modelDefinition);
        expect(loadTfModel).toBeCalledTimes(2);
        expect(loadTfModel).toBeCalledWith(CDN_PATH_DEFINITIONS[CDNS[1]](packageName, version, modelPath), 'layers');
      });

      it('throws if all attempts to fetch a model fail', async () => {
        const packageName = 'packageName';
        const version = 'version';
        const modelPath = 'modelPath';
        let i = 0;
        vi.mocked(loadTfModel).mockImplementation(async () => {
          throw new Error(`next: ${i++}`);
        });
        const modelDefinition: ModelDefinition = {
          _internals: {
            path: modelPath,
            name: packageName,
            version,
          },
          modelType: 'layers',
        };
        await expect(() => fetchModel(modelDefinition))
          .rejects
          .toThrowError(getLoadModelErrorMessage(CDNS.map((cdn, i) => [cdn, new Error(`next: ${i}`)]), modelPath, {
            path: modelPath,
            name: packageName,
            version,
          }));
      });
    });
  });

  describe('loadModel', () => {
    it('throws if not a valid model definition', async () => {
      const e = new Error(ERROR_MODEL_DEFINITION_BUG);
      vi.mocked(vi).mocked(isValidModelDefinition).mockImplementation(() => {
        throw new ModelDefinitionValidationError(MODEL_DEFINITION_VALIDATION_CHECK_ERROR_TYPE.UNDEFINED);
      });
      vi.mocked(vi).mocked(getModelDefinitionError).mockImplementation(() => e);

      await expect(() => loadModel(Promise.resolve({
        path: 'foo',
        scale: 2,
        modelType: 'layers',
      }))).rejects.toThrowError(e);
    });

    it('loads a valid layers model successfully', async () => {
      vi.mocked(vi).mocked(isValidModelDefinition).mockImplementation(() => true);
      const model = 'foo' as unknown as LayersModel;
      vi.mocked(loadTfModel).mockImplementation(async () => model);
      expect(loadTfModel).toHaveBeenCalledTimes(0);

      const modelDefinition: ModelDefinition = {
        path: 'foo',
        scale: 2,
        modelType: 'layers',
      };

      const result = await loadModel(Promise.resolve(modelDefinition));

      expect(loadTfModel).toHaveBeenCalledTimes(1);
      expect(loadTfModel).toHaveBeenCalledWith(modelDefinition.path, 'layers');

      expect(result).toStrictEqual({
        modelDefinition,
        model,
      });
    });

    it('loads a valid graph model successfully', async () => {
      vi.mocked(vi).mocked(isValidModelDefinition).mockImplementation(() => true);
      const model = 'foo' as unknown as GraphModel;
      tf.loadLayersModel.mockImplementation(async () => 'layers model' as any);
      tf.loadGraphModel.mockImplementation(async () => model);
      expect(tf.loadLayersModel).toHaveBeenCalledTimes(0);

      const modelDefinition: ModelDefinition = {
        path: 'foo',
        scale: 2,
        modelType: 'graph',
      };

      const result = await loadModel(Promise.resolve(modelDefinition));

      expect(loadTfModel).toHaveBeenCalledTimes(1);
      expect(loadTfModel).toHaveBeenCalledWith(modelDefinition.path, 'graph');

      expect(result).toStrictEqual({
        modelDefinition,
        model,
      });
    });
  });
});
