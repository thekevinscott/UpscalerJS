import { ModelDefinition } from 'upscaler/types';
import { NAME, VERSION } from './constants.generated';

const modelDefinition: ModelDefinition = {
  scale: 3,
  channels: 3,
  path: 'models/3x3/3x3.json',
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
