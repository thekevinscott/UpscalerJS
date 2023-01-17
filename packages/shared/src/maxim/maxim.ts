import type {  Meta, ModelDefinition, ModelDefinitionFn,  } from '../../../core/src/index';
import { modelDefinition as sharedModelDefinition, } from './modelDefinition';
import { registerKernels } from './registerKernels';
import { registerOps } from './registerOps';

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
  if ('node' in tf) {
    registerKernels(tf);
  }
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
  }
};
