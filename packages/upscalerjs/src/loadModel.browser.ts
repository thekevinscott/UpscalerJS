import { tf, } from './dependencies.generated';
import type { ModelDefinition, } from '@upscalerjs/core';
import type { PackageInformation, } from './types';
import { getModelDefinitionError, isValidModelDefinition, registerCustomLayers, } from './utils';

const CDNS = [
  (packageName: string, version: string, path: string) => `https://cdn.jsdelivr.net/npm/${packageName}@${version}/${path}`,
  (packageName: string, version: string, path: string) => `https://unpkg.com/${packageName}@${version}/${path}`,
  // 'cdnjs',
];

export const fetchModel = async (modelPath: string, packageInformation?: PackageInformation) => {
  if (packageInformation) {
    for (let i = 0; i < CDNS.length; i++) {
      const getCDNFn = CDNS[i];
      try {
        const url = getCDNFn(packageInformation.name, packageInformation.version, modelPath);
        return await tf.loadLayersModel(url);
      } catch (err) {
        // there was an issue with the CDN, try another
      }
    }
    throw new Error(`Could not resolve URL ${modelPath}`);
  }
  return await tf.loadLayersModel(modelPath);
};

export const loadModel = async (
  modelDefinition: ModelDefinition | undefined,
): Promise<{
  model: tf.LayersModel;
  modelDefinition: ModelDefinition;
}> => {
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
