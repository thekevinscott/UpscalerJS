import type { Meta, ModelDefinition, } from '../types';
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
}): ModelDefinition => ({
  inputRange: [0, 1,],
  outputRange: [0, 1,],
  preprocess: t => t.cast('float32'),
  setup: registerOps,
  modelType: 'graph',
  _internals: {
    path: modelPath,
    name,
    version,
  },
  meta,
  divisibilityFactor,
});
