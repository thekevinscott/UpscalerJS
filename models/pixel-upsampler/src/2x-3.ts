import { ModelDefinition } from 'upscaler/types';
import { NAME, VERSION } from './constants.generated';

const modelDefinition: ModelDefinition = {
  scale: 2,
  channels: 3,
  path: 'models/2x3/2x3.json',
  packageInformation: {
    name: NAME,
    version: VERSION,
  },
  meta: {
    dataset: null,
    name: 'normal',
  },
};

export = modelDefinition;
