import { ModelDefinition, } from '@upscalerjs/core';
import { NAME, VERSION, } from './constants.generated';

const getModelDefinition = (scale: 2 | 3 | 4): ModelDefinition => ({
  scale,
  path: `models/${scale}x/${scale}x.json`,
  modelType: 'layers',
  _internals: {
    packageInformation: {
      name: NAME,
      version: VERSION,
    },
  },
  meta: {
    dataset: null,
    name: 'normal',
  },
});

export default getModelDefinition;
