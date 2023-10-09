import type { ModelDefinition, } from '../../../packages/shared/src/types';
import { Scale, getESRGANModelDefinition, } from '../../../packages/shared/src/esrgan/esrgan';
import { NAME, VERSION, } from './constants.generated';

const getModelDefinition = (scale: Scale, modelFileName: string): ModelDefinition => getESRGANModelDefinition({
  scale,
  path: `models/x${scale}/model.json`,
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
    size: 'thick',
    artifactReducing: false,
    sharpening: false,
    dataset: 'div2k',
    modelFileName,
  },
});

export default getModelDefinition;
