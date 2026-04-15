/**
 * The core upscale pipeline, ported to ONNX Runtime.
 *
 * Side-by-side comparison with the tfjs implementation
 * (`packages/upscalerjs/src/shared/upscale.ts`) — this file is the most
 * important artifact of the spike. The **control flow is identical**:
 *
 *   1. image → tensor
 *   2. preprocess + rescale + pad
 *   3. patch loop:
 *        slice → model → post-slice → postprocess + rescale → concat
 *   4. trim to original × scale
 *
 * The **mechanics** are different at every step:
 *
 *   | tfjs                                  | ONNX Runtime                      |
 *   | ------------------------------------- | --------------------------------- |
 *   | `tf.tidy(() => ...)` wraps the world  | GC; no tidy needed                |
 *   | `model.predict(tensor)`               | `session.run({ input: ortT })`    |
 *   | `t.slice(begin, size)`                | `slice4D(t, begin, size)` helper  |
 *   | `tf.concat([a, b], axis)`             | `concat4D([a, b], axis)` helper   |
 *   | `t.dispose()`                         | no-op (drop reference)            |
 *   | NHWC throughout                       | transpose at model boundary       |
 */
import type {
  ModelPackage,
  PrivateUpscaleArgs,
  InternalConfig,
  SliceData,
  BASE64,
  TENSOR,
} from './types';
import { Tensor, type Shape4D, } from './tensor';
import { slice4D, concat4D, padTo, rescale, clamp, } from './tensor-utils';
import { getPatchesFromImage, } from './image-utils';

const isProgress = (p: unknown): p is Function => typeof p === 'function';
const isSingleArg = (p: Function) => p.length <= 1;

/**
 * Execute the ONNX model on a single rank-4 NHWC patch, handling the NCHW
 * transpose when the model requires it.
 */
export const executeModel = async (
  { model, modelDefinition, }: ModelPackage,
  patch: Tensor,
): Promise<Tensor> => {
  const layout = modelDefinition.layout ?? 'nhwc';
  const inputName = modelDefinition.inputName ?? model.inputNames[0];
  const outputName = modelDefinition.outputName ?? model.outputNames[0];
  const ortInput = await patch.toOrt(layout);
  const feeds: Record<string, typeof ortInput> = { [inputName]: ortInput, };
  const results = await model.run(feeds);
  const out = results[outputName];
  if (!out) {
    throw new Error(`Model did not return an output named "${outputName}". Got: ${Object.keys(results).join(', ')}`);
  }
  return Tensor.fromOrt(out, layout);
};

/**
 * Main pipeline. Kept shape-compatible with the tfjs generator so the public
 * API layer (`upscaler.ts`) can call it without knowing which backend is in use.
 */
export async function upscale<I>(
  input: I,
  args: PrivateUpscaleArgs,
  modelPackage: ModelPackage,
  { getImageAsTensor, tensorAsBase64, checkValidEnvironment, }: InternalConfig<I>,
  signal?: AbortSignal,
): Promise<string | Tensor> {
  checkValidEnvironment(input, { output: args.output, progressOutput: args.progressOutput, });

  const throwIfAborted = () => { if (signal?.aborted) { throw new Error('Upscale aborted'); } };

  // 1. image → tensor (NHWC, float32, [0, 255])
  throwIfAborted();
  const imageTensor = await getImageAsTensor(input);
  const pixels = imageTensor.rank === 3 ? imageTensor.expandDims() : imageTensor;
  const [, height, width,] = pixels.shape as Shape4D;
  const originalSize: Shape4D = pixels.shape as Shape4D;

  // 2. preprocess → rescale to model's input range → (optional) pad to fixed shape
  const { modelDefinition, } = modelPackage;
  const scale = modelDefinition.scale ?? 1;
  let preprocessed = pixels;
  if (modelDefinition.preprocess) { preprocessed = modelDefinition.preprocess(preprocessed); }
  preprocessed = rescale(preprocessed, [0, 255,], modelDefinition.inputRange ?? [0, 255,]);

  // Determine patch configuration.
  const patchSize = args.patchSize;
  const padding = args.padding ?? 0;

  if (!patchSize) {
    // Whole-image inference.
    throwIfAborted();
    const prediction = await executeModel(modelPackage, preprocessed);
    let post = prediction;
    if (modelDefinition.postprocess) { post = modelDefinition.postprocess(post); }
    post = rescale(post, modelDefinition.outputRange ?? [0, 255,], [0, 255,]);
    post = clamp(post, 0, 255);
    const out = post.squeeze();
    return args.output === 'tensor' ? out : tensorAsBase64(out);
  }

  // 3. Patch loop
  const patches = getPatchesFromImage([width, height,], patchSize, padding);
  const total = patches.length * patches[0].length;

  let upscaled: Tensor | undefined;
  for (let rowIdx = 0; rowIdx < patches.length; rowIdx++) {
    const row = patches[rowIdx];
    let rowAccum: Tensor | undefined;
    for (let colIdx = 0; colIdx < row.length; colIdx++) {
      throwIfAborted();
      const { pre, post, } = row[colIdx];

      // Slice the input patch.
      let patch = slice4D(preprocessed, [0, pre.origin[0], pre.origin[1], 0,], [-1, pre.size[0], pre.size[1], -1,]);

      // If model requires fixed input shape, pad the patch to it.
      // (Real-ESRGAN ONNX exports typically accept dynamic shapes; we leave
      // the hook here for models that don't.)

      // Model inference.
      const prediction = await executeModel(modelPackage, patch);

      // Take the valid (non-padding) region from the upscaled prediction.
      const postSliced = slice4D(
        prediction,
        [0, post.origin[0] * scale, post.origin[1] * scale, 0,],
        [-1, post.size[0] * scale, post.size[1] * scale, -1,],
      );

      // Postprocess + rescale to display range.
      let processed = postSliced;
      if (modelDefinition.postprocess) { processed = modelDefinition.postprocess(processed); }
      processed = rescale(processed, modelDefinition.outputRange ?? [0, 255,], [0, 255,]);
      processed = clamp(processed, 0, 255);

      // Progress callback (patch-level).
      if (args.progress && isProgress(args.progress)) {
        const pct = (rowIdx * row.length + colIdx + 1) / total;
        const progress = args.progress as Function;
        if (isSingleArg(progress)) {
          progress(pct);
        } else {
          const squeezed = processed.squeeze();
          const sliceData: SliceData = { row: rowIdx, col: colIdx, patchCoordinates: { pre, post, }, };
          if (args.progressOutput === 'tensor') {
            progress(pct, squeezed, sliceData);
          } else {
            progress(pct, tensorAsBase64(squeezed), sliceData);
          }
        }
      }

      rowAccum = concat4D([rowAccum, processed,], 2);
    }
    upscaled = concat4D([upscaled, rowAccum,], 1);
  }

  if (!upscaled) { throw new Error('Patch loop produced no tensor'); }

  // 4. Trim to `original × scale`. Patch padding can produce a slightly
  //    larger canvas when patch boundaries don't line up with the image edge.
  const targetH = originalSize[1] * scale;
  const targetW = originalSize[2] * scale;
  const trimmed = slice4D(upscaled, [0, 0, 0, 0,], [-1, targetH, targetW, -1,]);
  const result = trimmed.squeeze();
  return args.output === 'tensor' ? result : tensorAsBase64(result);
}
