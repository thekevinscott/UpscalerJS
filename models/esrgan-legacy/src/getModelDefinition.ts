import { ModelDefinition, } from '@upscalerjs/core';
import { Scale, getESRGANModelDefinition, } from '../../../packages/shared/src/esrgan/esrgan';
import { NAME, VERSION, } from './constants.generated';

const getModelDefinition = (scale: Scale, modelPath: string, architecture = 'rdn'): ModelDefinition => getESRGANModelDefinition({
  scale,
  path: `models/${modelPath}/model.json`,
  name: NAME,
  version: VERSION,
  meta: {
    dataset: 'div2k',
    architecture,
  },
});

export default getModelDefinition;
