import type { ModelDefinition, } from '../../../packages/shared/src/types';
import { Scale, getESRGANModelDefinition, } from '../../../packages/shared/src/esrgan/esrgan';
import { NAME, VERSION, } from './constants.generated';

const getModelDefinition = (scale: Scale, modelFileName: string): ModelDefinition => getESRGANModelDefinition({
  scale,
  path: `models/x${scale}/model.json`,
  name: NAME,
  version: VERSION,
  meta: {
    C: 1,
    D: 10,
    G: 64,
    G0: 64,
    T: 10,
    architecture: "rdn",
    patchSize: scale === 3 ? 129 : 128,
    size: 'medium',
    artifactReducing: false,
    sharpening: false,
    dataset: 'div2k',
    modelFileName,
  },
});

export default getModelDefinition;
