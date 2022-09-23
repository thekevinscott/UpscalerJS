import { ModelDefinition, PostProcess, TF, } from '@upscalerjs/core';
import { NAME, VERSION, } from '../constants.generated';

export const postprocess = (tf: TF): PostProcess => (output: Tensor) => tf.tidy<Tensor4D>(() => {
  const clippedValue = output.clipByValue(0, 255);
  output.dispose();
  return clippedValue as Tensor4D;
});

const modelDefinition: ModelDefinition = {
  scale: 2,
  channels: 3,
  path: 'models/model.json',
  packageInformation: {
    name: NAME,
    version: VERSION,
  },
  meta: {
  },
  postprocess,
};

export default modelDefinition;