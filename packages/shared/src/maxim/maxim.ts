import type {  Meta, ModelDefinition, ModelDefinitionFn,  } from '../../../core/src/index';
import { modelDefinition as sharedModelDefinition, } from './modelDefinition';
import { registerOps } from './registerOps';

export const getMaximDefinition = ({
  name,
  version,
  meta,
  path: modelPath,
  divisibilityFactor,
}: {
  name: string;
  version: string;
  meta: Meta;
  path: string;
  divisibilityFactor?: number;
}): ModelDefinitionFn => (tf): ModelDefinition => {
  registerOps(tf);
  return {
    ...sharedModelDefinition,
    modelType: 'graph',
    path: modelPath,
    packageInformation: {
      name,
      version,
    },
    meta,
    divisibilityFactor,
  }
};
