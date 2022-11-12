import type { Tensor, Tensor4D, } from '@tensorflow/tfjs-core';
import { PostProcess, TF, } from '@upscalerjs/core';

export const clipOutput = (tf: TF): PostProcess => (output: Tensor) => tf.tidy<Tensor4D>(() => {
  const clippedValue = output.clipByValue(0, 255);
  output.dispose();
  return clippedValue as Tensor4D;
});
