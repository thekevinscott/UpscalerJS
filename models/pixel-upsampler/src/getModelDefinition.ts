import { ModelDefinition, } from '@upscalerjs/core';
import { NAME, VERSION, } from './constants.generated';

const getModelDefinition = (scale: 2 | 3 | 4): ModelDefinition => ({
  scale,
  modelType: 'layers',
  _internals: {
    name: NAME,
    version: VERSION,
    path: `models/x${scale}/${scale}x.json`,
  },
  meta: {
    dataset: null,
    name: 'normal',
  },
});

export default getModelDefinition;
