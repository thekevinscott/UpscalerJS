import { tf, } from './dependencies.generated';
import { ModelDefinition, ModelDefinitionValidationError, ModelType, ModelConfigurationInternals, } from '@upscalerjs/core';
import type { ParsedModelDefinition, ModelPackage, } from './types';
import {
  loadTfModel,
  parseModelDefinition,
} from './model-utils';
import {
  ERROR_MODEL_DEFINITION_BUG,
  getModelDefinitionError,
} from './errors-and-warnings';
import {
  isValidModelDefinition,
} from '@upscalerjs/core';

type CDN = 'jsdelivr' | 'unpkg';

type CdnFn = (packageName: string, version: string, path: string) => string;

type Errors = [CDN, Error][];

export const CDN_PATH_DEFINITIONS: { [key in CDN]: CdnFn } = {
  'jsdelivr': (packageName, version, path) => `https://cdn.jsdelivr.net/npm/${packageName}@${version}/${path}`,
  'unpkg': (packageName, version, path) => `https://unpkg.com/${packageName}@${version}/${path}`,
};

export const CDNS: CDN[] = [
  'jsdelivr',
  'unpkg',
];

export const getLoadModelErrorMessage = (modelPath: string, internals: ModelConfigurationInternals, errs: Errors): Error => new Error([
  `Could not resolve URL ${modelPath} for package ${internals.name}@${internals.version}`,
  `Errors include:`,
  ...errs.map(([cdn, err, ]) => `- ${cdn}: ${err.message}`),
].join('\n'));

export async function fetchModel<M extends ModelType, R = M extends 'graph' ? tf.GraphModel : tf.LayersModel>({
  path: modelPath,
  modelType,
  _internals,
}: {
  modelType: M;
} & Omit<ParsedModelDefinition, 'modelType'>): Promise<R> {
  if (modelPath) {
    return await loadTfModel(modelPath, modelType);
  }
  if (_internals) {
    const errs: Errors = [];
    for (let i = 0; i < CDNS.length; i++) {
      const cdn = CDNS[i];
      const getCDNFn = CDN_PATH_DEFINITIONS[cdn];
      try {
        const url = getCDNFn(_internals.name, _internals.version, _internals.path);
        return await loadTfModel(url, modelType);
      } catch (err: unknown) {
        // there was an issue with the CDN, try another
        errs.push([cdn, err instanceof Error ? err : new Error(`There was an unknown error: ${JSON.stringify(err)}`), ]);
      }
    }
    throw getLoadModelErrorMessage(modelPath || _internals.path, _internals, errs);
  }
  throw new Error('huzzah')
}

export const loadModel = async (
  modelDefinition: ModelDefinition,
): Promise<ModelPackage> => {
  try {
    isValidModelDefinition(modelDefinition);
  } catch(err: unknown) {
    throw err instanceof ModelDefinitionValidationError ? getModelDefinitionError(err.type, modelDefinition) : new Error(ERROR_MODEL_DEFINITION_BUG);
  }

  const parsedModelDefinition = parseModelDefinition(modelDefinition);

  const model = await fetchModel(parsedModelDefinition);

  return {
    model,
    modelDefinition: parsedModelDefinition,
  };
};
