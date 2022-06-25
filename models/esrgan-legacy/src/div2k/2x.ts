import { ModelDefinition } from '@upscalerjs/core';
import { NAME, VERSION } from '../constants.generated';

const modelDefinition: ModelDefinition = {
  scale: 2,
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

export default modelDefinition;
