import { tf, } from './dependencies.generated';
import type { ModelDefinition, } from '@upscalerjs/core';
import type { ModelPackage, PackageInformation, } from './types';
import {
  getModelDefinitionError,
  isValidModelDefinition,
  registerCustomLayers,
} from './utils';

type CDN = 'jsdelivr' | 'unpkg';
type CDNFn = (packageName: string, version: string, path: string) => string;

const CDNs: CDN[] = ['jsdelivr', 'unpkg'];

export const CDNFns: {[key in CDN]: CDNFn} = {
  'jsdelivr': (packageName: string, version: string, path: string) => `https://cdn.jsdelivr.net/npm/${packageName}@${version}/${path}`,
  'unpkg': (packageName: string, version: string, path: string) => `https://unpkg.com/${packageName}@${version}/${path}`,
};

export const getLoadModelErrorMessage = (modelPath: string): Error => new Error(`Could not resolve URL ${modelPath}`);

export const fetchModel = async (modelPath: string, packageInformation?: PackageInformation): Promise<tf.LayersModel> => {
  if (packageInformation) {
    for (let i = 0; i < CDNs.length; i++) {
      const CDN = CDNs[i];
      const getCDNFn = CDNFns[CDN];
      try {
        const url = getCDNFn(packageInformation.name, packageInformation.version, modelPath);
        return await tf.loadLayersModel(url);
      } catch (err) {
        // there was an issue with the CDN, try another
      }
    }
    throw getLoadModelErrorMessage(modelPath);
  }
  return await tf.loadLayersModel(modelPath);
};

export const loadModel = async (
  modelDefinition: ModelDefinition | undefined,
): Promise<ModelPackage> => {
  if (isValidModelDefinition(modelDefinition)) {
    registerCustomLayers(modelDefinition);

    const model = await fetchModel(modelDefinition.path, modelDefinition.packageInformation);

    return {
      model,
      modelDefinition,
    };
  } else {
    throw getModelDefinitionError(modelDefinition);
  }
};
