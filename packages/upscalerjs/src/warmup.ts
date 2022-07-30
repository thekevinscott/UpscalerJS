import { tf, } from './dependencies.generated';
import type { ModelPackage, NumericWarmupSizes, WarmupSizes, WarmupSizesByPatchSize, } from './types';

const isWarmupSizeByPatchSize = (size: unknown): size is WarmupSizesByPatchSize => !!size && typeof size === 'object' && 'patchSize' in size;
const isNumericWarmupSize = (size: unknown): size is NumericWarmupSizes => {
  return !!size && Array.isArray(size) && size.length === 2 && typeof size[0] === 'number' && typeof size[1] === 'number';
};

export const getInvalidValueError = (size: unknown): Error => new Error(
  `Invalid value passed to warmup in warmupSizes. Expected two numbers, got ${JSON.stringify(size)}`
);

export const warmup = async (
  modelPackage: Promise<ModelPackage>,
  sizes: (WarmupSizes | unknown)[],
): Promise<void> => {
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
      if (isNumericWarmupSize(size)) {
        const [width, height,] = size;
        const pred = tf.tidy(() => model.predict(tf.zeros([1, height, width, 3,])) as tf.Tensor4D);
        await tf.nextFrame();
        pred.dataSync();
        pred.dispose();
      } else {
        throw getInvalidValueError(size);
      }
    }
  }
};
