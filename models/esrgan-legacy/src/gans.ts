import type { ModelDefinitionFn, TF, } from '@upscalerjs/core';
import { getESRGANModelDefinition, } from '../../../packages/shared/src/esrgan/esrgan';
import { NAME, VERSION, } from './constants.generated';

const modelDefinition: ModelDefinitionFn = (tf: TF) => {
  const SCALE = 4;

  return getESRGANModelDefinition({
    scale: SCALE, 
    path: 'models/gans/model.json',
    name: NAME,
    version: VERSION,
    meta: {
      dataset: 'div2k',
      architecture: "rrdn",
    },
  })(tf);
};

export default modelDefinition;
