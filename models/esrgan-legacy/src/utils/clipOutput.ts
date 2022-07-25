import type { Tensor, Tensor3D, } from '@tensorflow/tfjs-core';
import { PostProcess, TF, } from '@upscalerjs/core';

export const clipOutput = (tf: TF): PostProcess => (output: Tensor) => tf.tidy<Tensor3D>(() => {
  const clippedValue = output.clipByValue(0, 255);
  output.dispose();
  return clippedValue as Tensor3D;
});
