import { ModelDefinition, } from '@upscalerjs/core';
import { NAME, VERSION, } from './constants.generated';

const getModelDefinition = (scale: 2 | 3 | 4): ModelDefinition => ({
  scale,
  channels: 3,
  path: `models/${scale}x/${scale}x.json`,
  packageInformation: {
    name: NAME,
    version: VERSION,
  },
  meta: {
    dataset: null,
    name: 'normal',
  },
});

export default getModelDefinition;
