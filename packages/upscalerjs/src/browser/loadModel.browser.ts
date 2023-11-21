import type { LayersModel, } from '@tensorflow/tfjs-layers';
import type { ModelType, ModelConfigurationInternals, GraphModel, } from '../../../shared/src/types';
import type { LoadModel, ParsedModelDefinition, } from '../shared/types';
import {
  loadTfModel,
  parseModelDefinition,
} from '../shared/model-utils';
import {
  ERROR_MODEL_DEFINITION_BUG,
} from '../shared/errors-and-warnings';
import type {
  TF,
} from '../../../shared/src/types';
import { checkModelDefinition, } from '../shared/utils.js';

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

export const getLoadModelErrorMessage = (errs: Errors, modelPath: string, internals: ModelConfigurationInternals): Error => new Error([
  `Could not resolve URL ${modelPath} for package ${internals?.name}@${internals?.version}`,
  'Errors include:',
  ...errs.map(([cdn, err,]) => `- ${cdn}: ${err.message}`),
].join('\n'));

export async function fetchModel<M extends ModelType, R = M extends 'graph' ? GraphModel : LayersModel>(tf: TF, modelConfiguration: {
  modelType?: M;
} & Omit<ParsedModelDefinition, 'modelType'>): Promise<R> {
  const { modelType, _internals, path: modelPath, } = modelConfiguration;
  if (modelPath) {
    return await loadTfModel(tf, modelPath, modelType);
  }
  if (!_internals) {
    // This should never happen. This should have been caught by isValidModelDefinition.
    throw ERROR_MODEL_DEFINITION_BUG('Missing internals');
  }
  const errs: Errors = [];
  for (const cdn of CDNS) {
    const getCDNFn = CDN_PATH_DEFINITIONS[cdn];
    try {
      const url = getCDNFn(_internals.name, _internals.version, _internals.path);
      return await loadTfModel(tf, url, modelType);
    } catch (err: unknown) {
      // there was an issue with the CDN, try another
      errs.push([cdn, err instanceof Error ? err : new Error(`There was an unknown error: ${JSON.stringify(err)}`),]);
    }
  }
  throw getLoadModelErrorMessage(errs, modelPath || _internals.path, _internals);
}

export const loadModel: LoadModel<TF> = async (tf, _modelDefinition) => {
  const modelDefinition = await _modelDefinition;

  checkModelDefinition(modelDefinition);

  const parsedModelDefinition = parseModelDefinition(modelDefinition);

  const model = await fetchModel(tf, parsedModelDefinition);

  return {
    model,
    modelDefinition: parsedModelDefinition,
  };
};
