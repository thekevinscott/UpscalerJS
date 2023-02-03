import { Scale, getESRGANModelDefinition, } from '@shared/esrgan';
import { ModelDefinition, } from '@upscalerjs/core';
import { NAME, VERSION, } from './constants.generated';

const getModelDefinition = (scale: Scale, modelFileName: string): ModelDefinition => getESRGANModelDefinition({
  scale,
  name: NAME,
  version: VERSION,
  meta: {
    C: 4,
    D: 3,
    G: 32,
    G0: 64,
    T: 10,
    architecture: "rrdn",
    patchSize: scale === 3 ? 129 : 128,
    size: 'slim',
    artifactReducing: false,
    sharpening: false,
    dataset: 'div2k',
    modelFileName,
  },
});

export default getModelDefinition;
