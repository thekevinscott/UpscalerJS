import { ModelDefinitionFn, } from '@upscalerjs/core';
import { Scale, getESRGANModelDefinition, } from '../../../packages/shared/src/esrgan';
import { NAME, VERSION, } from './constants.generated';

const getModelDefinition = (scale: Scale, path: string, architecture = 'rdn'): ModelDefinitionFn => getESRGANModelDefinition({
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

