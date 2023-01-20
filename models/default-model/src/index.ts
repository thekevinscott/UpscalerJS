import type { Tensor, Tensor4D, } from '@tensorflow/tfjs-core';
import { ModelDefinitionFn, } from '@upscalerjs/core';
import { NAME, VERSION, } from './constants.generated';
import { PostProcess, TF, } from '@upscalerjs/core';

const SCALE = 2;

const clipOutput = (tf: TF): PostProcess => (output: Tensor) => tf.tidy<Tensor4D>(() => {
  const clippedValue = output.clipByValue(0, 255);
  output.dispose();
  return clippedValue as Tensor4D;
});

const modelDefinition: ModelDefinitionFn = tf => ({
  scale: SCALE,
  path: `models/model.json`,
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
    patchSize: 128,
    size: 'slim',
    artifactReducing: false,
    sharpening: false,
    dataset: 'div2k',
    modelFileName: 'rdn-C1-D2-G4-G064-T10-x2-patchsize128-compress100-sharpen0-datadiv2k-vary_cFalse_best-val_loss_epoch494',
  },
  postprocess: clipOutput(tf),
});

export default modelDefinition;
