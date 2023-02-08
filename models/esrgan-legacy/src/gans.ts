import { ModelDefinitionFn, } from '@upscalerjs/core';
import { getESRGANModelDefinition, } from '../../../packages/shared/src/esrgan';
// import getModelDefinition from './getModelDefinition';
import { NAME, VERSION, } from './constants.generated';

const SCALE = 2;

// const modelDefinition: ModelDefinitionFn = getModelDefinition(SCALE, 'gans', 'rrdn');

const modelDefinition: ModelDefinitionFn = getESRGANModelDefinition({
  scale: SCALE,
  path: `models/gans/model.json`,
  name: NAME,
  version: VERSION,
  meta: {
    dataset: 'div2k',
    architecture: 'rrdn',
  },
});

// export default getModelDefinition;


export default modelDefinition;
