import { ModelDefinition, } from '@upscalerjs/core';
import { NAME, VERSION, } from '../constants.generated';
import { Scale, } from '../types';

const getModelDefinition = (scale: Scale, modelFileName: string): ModelDefinition => ({
  scale,
  path: `models/${scale}x/model.json`,
  packageInformation: {
    name: NAME,
    version: VERSION,
  },
  meta: {
    C: 1,
    D: 10,
    G: 64,
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
  inputRange: [0,255,],
  outputRange: [0,255,],
});

export default getModelDefinition;
