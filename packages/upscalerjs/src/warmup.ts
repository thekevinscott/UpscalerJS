import { tf, } from './dependencies.generated';
import type { ModelDefinition, } from '@upscalerjs/core';
import type { WarmupSizes, WarmupSizesByPatchSize, } from './types';

const isWarmupSizeByPatchSize = (
  size: WarmupSizes,
): size is WarmupSizesByPatchSize => {
  return 'patchSize' in size;
};

export const warmup = async (
  modelPackage: Promise<{
    model: tf.LayersModel;
    modelDefinition: ModelDefinition;
  }>,
  sizes: WarmupSizes[],
) => {
  await tf.nextFrame();
  const { model, } = await modelPackage;
  for (const size of sizes) {
    if (isWarmupSizeByPatchSize(size)) {
      const { patchSize, padding = 0, } = size;

      const amount = patchSize + padding * 2;
      const pred = tf.tidy(() => model.predict(tf.zeros([1, amount, amount, 3,])) as tf.Tensor4D);
      await tf.nextFrame();
      pred.dataSync();
      pred.dispose();
    } else {
      if (typeof size[0] !== 'number' || typeof size[1] !== 'number') {
        throw new Error(
          `Invalid value passed to warmup in warmupSizes. Expected two numbers, got ${size.join(
            ',',
          )}`,
        );
      }
      const [width, height,] = size;
      const pred = tf.tidy(() => model.predict(tf.zeros([1, height, width, 3,])) as tf.Tensor4D);
      await tf.nextFrame();
      pred.dataSync();
      pred.dispose();
    }
  }
};
