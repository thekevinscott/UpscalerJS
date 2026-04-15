/**
 * Warmup — primes the ONNX Runtime session with dummy tensors of the
 * expected patch size so the first real inference isn't delayed by lazy
 * kernel compilation / WebGPU shader creation.
 *
 * Counterpart to `packages/upscalerjs/src/shared/warmup.ts`.
 */
import type { ModelPackage, WarmupSizes, WarmupArgs, WarmupSizesByPatchSize, } from './types';
import { Tensor, } from './tensor';
import { executeModel, } from './upscale';

const normalizeSizes = (sizes: WarmupSizes): WarmupSizesByPatchSize[] => {
  const arr = Array.isArray(sizes) ? sizes : [sizes,];
  return arr.map(s => typeof s === 'number' ? { patchSize: s, } : s);
};

export const warmup = async (
  modelPromise: Promise<ModelPackage>,
  sizes: WarmupSizes,
  _opts?: WarmupArgs,
  { signal, }: { signal?: AbortSignal; } = {},
): Promise<void> => {
  const modelPackage = await modelPromise;
  for (const { patchSize, } of normalizeSizes(sizes)) {
    if (signal?.aborted) { throw new Error('Warmup aborted'); }
    const dummy = new Tensor(
      new Float32Array(1 * patchSize * patchSize * 3),
      [1, patchSize, patchSize, 3,],
    );
    await executeModel(modelPackage, dummy);
  }
};
