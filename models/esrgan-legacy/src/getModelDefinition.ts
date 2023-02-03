import { Scale, getESRGANModelDefinition, } from '@shared/esrgan';
import { ModelDefinition, } from '@upscalerjs/core';
import { NAME, VERSION, } from './constants.generated';

const getModelDefinition = (scale: Scale, path: string, architecture: string = 'rdn'): ModelDefinition => getESRGANModelDefinition({
  scale,
  path: `models/${path}/model.json`,
  name: NAME,
  version: VERSION,
  meta: {
    architecture,
    dataset: 'div2k',
  },
});

export default getModelDefinition;

