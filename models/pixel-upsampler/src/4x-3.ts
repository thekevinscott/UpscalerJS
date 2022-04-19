import { ModelDefinition } from 'upscaler/types';
import { NAME, VERSION } from './constants.generated';

const modelDefinition: ModelDefinition = {
  scale: 4,
  channels: 3,
  path: 'models/model.json',
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
