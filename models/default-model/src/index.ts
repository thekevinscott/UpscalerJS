import { ModelDefinition, } from '@upscalerjs/core';
import { getESRGANModelDefinition, } from '../../../packages/shared/src/esrgan/esrgan';
import { name, version, } from '../package.json';

const SCALE = 2;

const modelDefinition: ModelDefinition = getESRGANModelDefinition({
  scale: SCALE,
  name,
  version,
  path: 'models/model.json',
  meta: {
    C: 1,
    D: 2,
    G: 4,
    G0: 64,
    T: 10,
    architecture: "rdn",
    patchSize: 128,
    size: 'slim',
    artifactReducing: false,
    sharpening: false,
    dataset: 'div2k',
    modelFileName: 'rdn-C1-D2-G4-G064-T10-x2-patchsize128-compress100-sharpen0-datadiv2k-vary_cFalse_best-val_loss_epoch494',
  },
});

export default modelDefinition;
