import type { Tensor4D, } from '@tensorflow/tfjs-core';
import type * as _tfng from '@tensorflow/tfjs-node-gpu';
import type * as _tfn from '@tensorflow/tfjs-node';
import type * as _tf from '@tensorflow/tfjs';

type TF = typeof _tf | typeof _tfn | typeof _tfng;
import { PostProcess, } from '@upscalerjs/core';
import getModelDefinition from '../getModelDefinition';

const postProcess: PostProcess = (output: Tensor4D) => tf.tidy(() => {
  const clippedValue = (output).clipByValue(0, 255);
  output.dispose();
  return clippedValue;
});

export default getModelDefinition(2, 'div2k/2x', postProcess);
