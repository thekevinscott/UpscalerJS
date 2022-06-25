import { ModelDefinition } from '@upscalerjs/core';
import { NAME, VERSION } from '../constants.generated';

const modelDefinition: ModelDefinition = {
  scale: 4,
  channels: 3,
  path: 'models/div2k/017-4x/model.json',
  packageInformation: {
    name: NAME,
    version: VERSION,
  },
  meta: {
    dataset: 'div2k',
  },
};

export default modelDefinition;
