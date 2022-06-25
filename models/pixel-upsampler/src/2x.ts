import { ModelDefinition } from '@upscalerjs/core';
import { NAME, VERSION } from './constants.generated';

const modelDefinition: ModelDefinition = {
  scale: 2,
  channels: 3,
  path: 'models/2x/2x.json',
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
