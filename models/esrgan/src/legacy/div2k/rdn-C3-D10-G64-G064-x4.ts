import { ModelDefinition } from 'upscaler/types';
import { NAME, VERSION } from '../../constants.generated';

const modelDefinition: ModelDefinition = {
  scale: 4,
  channels: 3,
  path: 'models/div2k/005-2x/model.json',
  packageInformation: {
    name: NAME,
    version: VERSION,
  },
  meta: {
    dataset: 'div2k',
  },
};

export = modelDefinition;
