import { makeTick, } from './makeTick';
import { tf, } from './dependencies.generated';
import type { ModelPackage, NumericWarmupSizes, WarmupArgs, WarmupSizes, WarmupSizesByPatchSize, YieldedIntermediaryValue, } from './types';
import { processAndDisposeOfTensor, wrapGenerator, } from './utils';

export const isWarmupSizeByPatchSize = (size: unknown): size is WarmupSizesByPatchSize => {
  if (!size || typeof size !== 'object') {
    return false;
  }
  return 'patchSize' in size && typeof (size as { patchSize: unknown })['patchSize'] === 'number';
};
export const isNumericWarmupSize = (size: unknown): size is NumericWarmupSizes => {
  return Boolean(size) && Array.isArray(size) && size.length === 2 && typeof size[0] === 'number' && typeof size[1] === 'number';
};

export const getInvalidValueError = (size: unknown): Error => new Error(
  `Invalid value passed to warmup in warmupSizes: ${JSON.stringify(size)}`
);

const getWidthAndHeight = (size: NumericWarmupSizes | WarmupSizesByPatchSize): [number, number] => {
  if (isWarmupSizeByPatchSize(size)) {
    const { patchSize, padding = 0, } = size;
    const amount = patchSize + padding * 2;
    return [amount, amount,];
  }
  return size;
};

export async function* warmup(
  modelPackage: Promise<ModelPackage>,
  sizes: (NumericWarmupSizes | WarmupSizesByPatchSize)[],
): AsyncGenerator<YieldedIntermediaryValue> {
  const { model, modelDefinition, } = await modelPackage;
  for (const size of sizes) {
    if (!isWarmupSizeByPatchSize(size) && !isNumericWarmupSize(size)) {
      throw getInvalidValueError(size);
    }
    const [ width, height, ] = getWidthAndHeight(size);

    let dummyTensor = tf.zeros([1, height, width, 3,]) as tf.Tensor4D;
    yield [dummyTensor,];

    const fns = [
      modelDefinition.preprocess,
      (t: tf.Tensor4D) => model.predict(t) as tf.Tensor4D,
      modelDefinition.postprocess,
    ].filter(Boolean);
    for (let i = 0; i < fns.length; i++) {
      const fn = fns[i];
      dummyTensor = processAndDisposeOfTensor(dummyTensor, fn);
      yield [dummyTensor,];
    }
    dummyTensor.dispose();

    yield;
  }
}

export const getSizesAsArray = (sizes: WarmupSizes): (NumericWarmupSizes | WarmupSizesByPatchSize)[] => {
  if (Array.isArray(sizes)) {
    if (isNumericWarmupSize(sizes)) {
      return [sizes,];
    }

    for (const size of sizes) {
      if (!isWarmupSizeByPatchSize(size) && !isNumericWarmupSize(size)) {
        throw getInvalidValueError(size);
      }
    }
    return sizes;
  } else if (isWarmupSizeByPatchSize(sizes)) {
    return [sizes,];
  }
  throw getInvalidValueError(sizes);
};

export const cancellableWarmup = async (
  modelPackage: Promise<ModelPackage>,
  sizes: WarmupSizes,
  { signal = undefined, awaitNextFrame = false, }: WarmupArgs = {},
  internalArgs: { // skipcq: js-0302
    signal: AbortSignal;
  },
): Promise<void> => {
  const tick = makeTick(signal || internalArgs.signal, awaitNextFrame);
  await tick();
  await wrapGenerator(warmup(
    modelPackage,
    getSizesAsArray(sizes),
  ), tick);
};
