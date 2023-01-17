import type { ModelDefinition, } from '../../../core/src/index';

export const modelDefinition: Partial<ModelDefinition> = {
  modelType: 'graph',
  inputRange: [0, 1,],
  outputRange: [0, 1,],
  preprocess: t => t.cast('float32'),
};
