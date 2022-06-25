import { ModelDefinition } from '@upscalerjs/core';
import { NAME, VERSION } from './constants.generated';

const modelDefinition: ModelDefinition = {
  scale: 3,
  channels: 3,
  path: 'models/3x/3x.json',
  packageInformation: {
    name: NAME,
    version: VERSION,
  },
  meta: {
    dataset: null,
    name: 'normal',
  },
};

export default modelDefinition;
