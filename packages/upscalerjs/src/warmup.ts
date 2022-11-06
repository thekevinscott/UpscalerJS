import { makeTick, } from './makeTick';
import { tf, } from './dependencies.generated';
import type { ModelPackage, NumericWarmupSizes, WarmupArgs, WarmupSizes, WarmupSizesByPatchSize, YieldedIntermediaryValue, } from './types';
import { wrapGenerator, } from './utils';

const isWarmupSizeByPatchSize = (size: unknown): size is WarmupSizesByPatchSize => size !== null && typeof size === 'object' && 'patchSize' in size;
const isNumericWarmupSize = (size: unknown): size is NumericWarmupSizes => {
  return size !== undefined && Array.isArray(size) && size.length === 2 && typeof size[0] === 'number' && typeof size[1] === 'number';
};

export const getInvalidValueError = (size: unknown): Error => new Error(
  `Invalid value passed to warmup in warmupSizes. Expected two numbers, got ${JSON.stringify(size)}`
);

const warmupModel = async (model: ModelPackage['model'], [width, height,]: NumericWarmupSizes) => {
  const pred = tf.tidy(() => model.predict(tf.zeros([1, height, width, 3,])) as tf.Tensor4D);
  await tf.nextFrame();
  pred.dataSync();
  pred.dispose();
};

const getWidthAndHeight = (size: WarmupSizes): [number, number] => {
  if (isWarmupSizeByPatchSize(size)) {
    const { patchSize, padding = 0, } = size;
    const amount = patchSize + padding * 2;
    return [amount, amount,];
  }
  return size;
};

export async function* warmup(
  modelPackage: Promise<ModelPackage>,
  sizes: (WarmupSizes | unknown)[],
): AsyncGenerator<YieldedIntermediaryValue> {
  const { model, } = await modelPackage;
  yield;
  for (const size of sizes) {
    if (!isWarmupSizeByPatchSize(size) && !isNumericWarmupSize(size)) {
      throw getInvalidValueError(size);
    }
    await warmupModel(model, getWidthAndHeight(size));
    yield;
  }
}

export const cancellableWarmup = async (
  modelPackage: Promise<ModelPackage>,
  sizes: (WarmupSizes | unknown)[],
  { signal = undefined, awaitNextFrame = false, }: WarmupArgs = {},
  internalArgs: { // skipcq: js-0302
    signal: AbortSignal;
  },
): Promise<void> => {
  const tick = makeTick(signal || internalArgs.signal, awaitNextFrame);
  await tick();
  await wrapGenerator(warmup(
    modelPackage,
    sizes,
  ), tick);
  await tick();
};
