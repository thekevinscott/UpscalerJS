import { ModelDefinitionFn, } from '@upscalerjs/core';
import { Scale, getESRGANModelDefinition, } from '../../../packages/shared/src/esrgan/esrgan';
import { NAME, VERSION, } from './constants.generated';

const getModelDefinition = (scale: Scale, modelFileName: string): ModelDefinitionFn => getESRGANModelDefinition({
  scale,
  path: `models/${scale}x/model.json`,
  name: NAME,
  version: VERSION,
  meta: {
    C: 1,
    D: 2,
    G: 4,
    G0: 64,
    T: 10,
    architecture: "rdn",
    patchSize: scale === 3 ? 129 : 128,
    size: 'slim',
    artifactReducing: false,
    sharpening: false,
    dataset: 'div2k',
    modelFileName,
  },
});

export default getModelDefinition;
