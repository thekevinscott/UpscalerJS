/**
 * Model-loading + parsing utilities for the ONNX backend.
 *
 * Counterpart to `packages/upscalerjs/src/shared/model-utils.ts`. Notable
 * differences from the tfjs implementation:
 *
 * - One `.onnx` file vs. `model.json` + N weight shards. Simpler to host.
 * - No `tf.loadLayersModel` / `tf.loadGraphModel` distinction — all ONNX
 *   models go through `ort.InferenceSession.create()`.
 * - The session is platform-specific: `onnxruntime-web` in the browser,
 *   `onnxruntime-node` on Node. Callers inject it.
 */
import type { InferenceSession, } from 'onnxruntime-common';
import type { ModelDefinition, ModelDefinitionObjectOrFn, } from './types';

/** Normalise a ModelDefinition value (object OR factory) into a Promise. */
export const getModel = async (d: ModelDefinitionObjectOrFn): Promise<ModelDefinition> => {
  const def = typeof d === 'function' ? await d() : d;
  return def;
};

export const checkModelDefinition = (def: ModelDefinition): void => {
  if (!def.path && !def._internals) {
    throw new Error('ModelDefinition requires either `path` or `_internals`');
  }
  if (def.modelType && def.modelType !== 'onnx') {
    throw new Error(`Unsupported modelType "${def.modelType}" — only "onnx" is supported in this backend`);
  }
};

export const parseModelDefinition = (def: ModelDefinition): ModelDefinition => ({
  modelType: 'onnx',
  layout: 'nhwc',
  inputRange: [0, 255,],
  outputRange: [0, 255,],
  scale: 1,
  channels: 3,
  ...def,
});

/**
 * Introspect the ONNX session to figure out whether the model has a fixed
 * input size (some Real-ESRGAN exports do) or accepts dynamic H/W.
 * Returns `undefined` when the model accepts any size.
 *
 * In tfjs, this information comes from `LayersModel.inputs[0].shape`; in
 * ONNX it's on `session.inputMetadata[name].dimensions`, where symbolic
 * dims appear as strings (e.g. `"height"`) or `-1`.
 */
export const getModelInputShape = (
  session: InferenceSession,
  inputName?: string,
): [number, number, number, number,] | undefined => {
  const name = inputName ?? session.inputNames[0];
  // onnxruntime-common exposes this via the `inputMetadata` map when available.
  // Fall back to undefined if the runtime doesn't expose metadata.
  const meta = (session as unknown as { inputMetadata?: Record<string, { dimensions?: Array<number | string>; }>; }).inputMetadata;
  const dims = meta?.[name]?.dimensions;
  if (!dims || dims.length !== 4) { return undefined; }
  if (dims.some(d => typeof d === 'string' || (typeof d === 'number' && d <= 0))) {
    return undefined;
  }
  return dims as [number, number, number, number,];
};
