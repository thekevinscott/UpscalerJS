import { ModelDefinitionFn, } from '@upscalerjs/core';
import { NAME, VERSION, } from '../constants.generated';
import { Scale, } from '../types';
import { clipOutput, } from './clipOutput';

const getModelDefinition = (scale: Scale, modelFileName: string): ModelDefinitionFn => tf => ({
  scale,
  channels: 3,
  path: `models/${scale}x/model.json`,
  packageInformation: {
    name: NAME,
    version: VERSION,
  },
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
  postprocess: clipOutput(tf),
});

export default getModelDefinition;

