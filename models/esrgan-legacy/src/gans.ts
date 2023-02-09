import type { ModelDefinitionFn, TF, } from '@upscalerjs/core';
import { getESRGANModelDefinition, } from '../../../packages/shared/src/esrgan';
import { NAME, VERSION, } from './constants.generated';

const SCALE = 4;
const modelDefinition: ModelDefinitionFn = (tf: TF) => {
  return getESRGANModelDefinition({
    scale: SCALE, 
    path: `models/gans/model.json`,
    name: NAME,
    version: VERSION,
    meta: {
      dataset: 'div2k',
      architecture: "rrdn",
    },
  })(tf);
};

export default modelDefinition;
