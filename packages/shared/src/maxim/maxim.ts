import type {  Meta, ModelDefinition, ModelDefinitionFn,  } from '../../../core/src/index';
import { modelDefinition as sharedModelDefinition, } from './modelDefinition';

const getDivisibilityFactor = (pathname: string) => pathname.includes('large') ? 64 : undefined;

export const getMaximDefinition = ({
  name,
  version,
  meta,
  path: modelPath,
}: {
  name: string;
  version: string;
  meta: Meta;
  path: string;
}): ModelDefinitionFn => (tf): ModelDefinition => {
  return {
    ...sharedModelDefinition,
    modelType: 'graph',
    path: modelPath,
    packageInformation: {
      name,
      version,
    },
    meta,
    divisibilityFactor: getDivisibilityFactor(modelPath),
  }
};
