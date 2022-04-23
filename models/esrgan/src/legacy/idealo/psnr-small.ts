import { ModelDefinition } from 'upscaler/types';
import { NAME, VERSION } from '../../constants.generated';

const modelDefinition: ModelDefinition = {
  scale: 2,
  channels: 3,
  path: 'models/idealo/psnr-small-quant-uint8/model.json',
  packageInformation: {
    name: NAME,
    version: VERSION,
  },
  meta: {
    dataset: 'div2k',
  },
};

export = modelDefinition;
