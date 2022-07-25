import type { Tensor, Tensor3D, } from '@tensorflow/tfjs-core';
// import type * as _tfng from '@tensorflow/tfjs-node-gpu';
// import type * as _tfn from '@tensorflow/tfjs-node';
// import type * as _tf from '@tensorflow/tfjs';
import { PostProcess, ModelDefinitionFn, TF, } from '@upscalerjs/core';
import getModelDefinition from '../getModelDefinition';

// type TF = typeof _tf | typeof _tfn | typeof _tfng;
// TODO: Why do I need to specify TF here? Why can't it infer it from @upscaler/core's type definition?
const modelDefinition: ModelDefinitionFn = (tf: TF) => {
  const postProcess: PostProcess = (output: Tensor) => tf.tidy<Tensor3D>(() => {
    const clippedValue = output.clipByValue(0, 255);
    output.dispose();
    return clippedValue as Tensor3D;
  });
  return getModelDefinition(2, 'div2k/2x', postProcess);
};

export default modelDefinition;
