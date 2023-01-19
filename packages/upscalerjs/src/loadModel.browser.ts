import { tf, } from './dependencies.generated';
import type { ModelDefinition, } from '@upscalerjs/core';
import type { ModelPackage, PackageInformation, } from './types';
import {
  getModelDefinitionError,
  registerCustomLayers,
} from './utils';
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

export const getLoadModelErrorMessage = (modelPath: string, packageInformation: PackageInformation, errs: Errors): Error => new Error([
  `Could not resolve URL ${modelPath} for package ${packageInformation.name}@${packageInformation.version}`,
  `Errors include:`,
  ...errs.map(([cdn, err, ]) => `- ${cdn}: ${err.message}`),
].join('\n'));

export const fetchModel = async (modelPath: string, packageInformation?: PackageInformation): Promise<tf.LayersModel> => {
  if (packageInformation) {
    const errs: Errors = [];
    for (let i = 0; i < CDNS.length; i++) {
      const cdn = CDNS[i];
      const getCDNFn = CDN_PATH_DEFINITIONS[cdn];
      try {
        const url = getCDNFn(packageInformation.name, packageInformation.version, modelPath);
        return await tf.loadLayersModel(url);
      } catch (err: unknown) {
        // there was an issue with the CDN, try another
        errs.push([cdn, err instanceof Error ? err : new Error(`There was an unknown error: ${JSON.stringify(err)}`), ]);
      }
    }
    throw getLoadModelErrorMessage(modelPath, packageInformation, errs);
  }
  return await tf.loadLayersModel(modelPath);
};

export const loadModel = async (
  modelDefinition: ModelDefinition,
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
