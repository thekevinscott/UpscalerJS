import { makeTick, } from './makeTick';
import { tf, } from './dependencies.generated';
import type { ModelPackage, NumericWarmupSizes, WarmupArgs, WarmupSizes, WarmupSizesByPatchSize, YieldedIntermediaryValue, } from './types';
import { processAndDisposeOfTensor, wrapGenerator, } from './utils';

export const isWarmupSizeByPatchSize = (size: unknown): size is WarmupSizesByPatchSize => {
  if (!size || typeof size !== 'object') {
    return false;
  }
  return 'patchSize' in size && typeof (size as { patchSize: unknown }).patchSize === 'number';
};
export const isNumericWarmupSize = (size: unknown): size is NumericWarmupSizes => {
  return Boolean(size) && typeof size === 'number' && size > 0;
};

const ERROR_INVALID_WARMUP_VALUE_URL =
  'https://upscalerjs.com/documentation/troubleshooting#invalid-warmup-value';

export const ERROR_INVALID_WARMUP_VALUE = (size: unknown) => ([
  'Invalid value passed to warmup in warmupSizes:',
  JSON.stringify(size),
  `For more information, see ${ERROR_INVALID_WARMUP_VALUE_URL}.`,
].join('\n'));

export const getInvalidValueError = (size: unknown): Error => new Error(ERROR_INVALID_WARMUP_VALUE(size));

const getWidthAndHeight = (size: NumericWarmupSizes | WarmupSizesByPatchSize): number => {
  if (isWarmupSizeByPatchSize(size)) {
    const { patchSize, } = size;
    return patchSize;
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
    const warmupSize = getWidthAndHeight(size);

    let dummyTensor = tf.zeros([1, warmupSize, warmupSize, 3,]) as tf.Tensor4D;
    yield [dummyTensor,];

    const fns = [
      modelDefinition.preprocess,
      (t: tf.Tensor4D) => model.predict(t) as tf.Tensor4D,
      modelDefinition.postprocess,
    ].filter(Boolean);

    for (const fn of fns) {
      dummyTensor = processAndDisposeOfTensor(dummyTensor, fn);
      yield [dummyTensor,];
    }
    dummyTensor.dispose();

    yield;
  }
}

export const getSizesAsArray = (sizes: WarmupSizes): (NumericWarmupSizes | WarmupSizesByPatchSize)[] => {
  if (Array.isArray(sizes)) {
    for (const size of sizes) {
      if (!isWarmupSizeByPatchSize(size) && !isNumericWarmupSize(size)) {
        throw getInvalidValueError(sizes);
      }
    }
    return sizes;
  } else if (isWarmupSizeByPatchSize(sizes) || isNumericWarmupSize(sizes)) {
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
  const tick = makeTick(tf, signal || internalArgs.signal, awaitNextFrame);
  await tick();
  await wrapGenerator(warmup(
    modelPackage,
    getSizesAsArray(sizes),
  ), tick);
};
