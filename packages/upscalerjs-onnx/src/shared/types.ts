/**
 * Public + private types for the ONNX-backed Upscaler.
 *
 * Structurally mirrors `packages/upscalerjs/src/shared/types.ts` — same names,
 * same fields — so consumers of the tfjs package can migrate without touching
 * their call sites in most cases.
 *
 * Key differences vs. the tfjs types:
 *
 * - `ModelDefinition.preprocess` / `postprocess` now take the local `Tensor`
 *   type instead of `@tensorflow/tfjs-core`'s `Tensor4D`. **This is a
 *   breaking change** for authors of model packages — see MIGRATION.md.
 * - No `setup(tf)` / `teardown(tf)` hooks — there is no equivalent of the
 *   tfjs instance to pass through. ORT is stateless from the library's POV.
 * - `modelType` options are `'onnx'` (replacing `'layers' | 'graph'`).
 * - `ModelPackage.model` is an `ort.InferenceSession`, not a
 *   `tf.LayersModel | tf.GraphModel`.
 */
import type { InferenceSession, } from 'onnxruntime-common';
import type { Tensor, } from './tensor';

// ─── Progress + output formats (identical to tfjs version) ────────────────
export type BASE64 = 'base64';
export type TENSOR = 'tensor';
export type ResultFormat = BASE64 | TENSOR | undefined;

export type Coordinate = [number, number];
export type PatchCoordinates = { origin: Coordinate; size: Coordinate; };
export type Patch = { pre: PatchCoordinates; post: PatchCoordinates; };

export interface SliceData {
  row: number;
  col: number;
  patchCoordinates: { pre: PatchCoordinates; post: PatchCoordinates; };
}

export type SingleArgProgress = (amount: number) => void;
export type MultiArgStringProgress = (amount: number, slice: string, sliceData: SliceData) => void;
export type MultiArgTensorProgress = (amount: number, slice: Tensor, sliceData: SliceData) => void;
export type Progress = SingleArgProgress | MultiArgStringProgress | MultiArgTensorProgress;

// ─── Warmup (identical to tfjs version) ───────────────────────────────────
export type NumericWarmupSizes = number;
export type WarmupSizesByPatchSize = { patchSize: number; padding?: number; };
export type WarmupSizes = NumericWarmupSizes | WarmupSizesByPatchSize | (NumericWarmupSizes | WarmupSizesByPatchSize)[];

// ─── Model definition ─────────────────────────────────────────────────────
/**
 * Input/output layout the model expects. ORT models are commonly NCHW
 * (channels-first) whereas the tfjs pipeline is NHWC; we expose this so
 * `ModelDefinition` authors declare it once and the runtime handles transposes.
 */
export type TensorLayout = 'nhwc' | 'nchw';

export interface ModelDefinitionInternals {
  name: string;
  version: string;
  /** Path inside the npm package, relative to its root. Usually the `.onnx` file. */
  path: string;
}

export interface ModelDefinition {
  modelType?: 'onnx';
  /** Direct URL or local path to a `.onnx` file. Overrides `_internals`. */
  path?: string;
  /** Super-resolution scale factor (e.g. 2, 3, 4). */
  scale?: number;
  channels?: 3;
  /** Package metadata, used for CDN resolution when `path` is not provided. */
  _internals?: ModelDefinitionInternals;

  /** Layout of the model's primary input/output tensor. Defaults to `'nhwc'`. */
  layout?: TensorLayout;
  /** Input name in the ONNX graph (defaults to the session's first input). */
  inputName?: string;
  /** Output name in the ONNX graph (defaults to the session's first output). */
  outputName?: string;

  /** Applied to the incoming tensor before rescaling. */
  preprocess?: (t: Tensor) => Tensor;
  /** Applied to the predicted tensor before rescaling and trimming. */
  postprocess?: (t: Tensor) => Tensor;
  /** Expected value range of inputs, e.g. `[0, 1]` or `[-1, 1]`. Default `[0, 255]`. */
  inputRange?: [number, number];
  /** Value range of outputs. Default `[0, 255]`. */
  outputRange?: [number, number];
  /** If the model requires inputs whose H/W is divisible by this. */
  divisibilityFactor?: number;
  meta?: Record<string, unknown>;
}

export type ModelDefinitionFn = () => ModelDefinition | Promise<ModelDefinition>;
export type ModelDefinitionObjectOrFn = ModelDefinition | ModelDefinitionFn;

export interface ModelPackage {
  model: InferenceSession;
  modelDefinition: ModelDefinition;
}

// ─── Upscaler options (identical public shape to tfjs version) ────────────
export interface UpscalerOptions {
  model?: ModelDefinitionObjectOrFn;
  warmupSizes?: WarmupSizes;
}

interface SharedArgs {
  signal?: AbortSignal;
  awaitNextFrame?: boolean;
}

export interface UpscaleArgs extends SharedArgs {
  output?: BASE64 | TENSOR;
  patchSize?: number;
  padding?: number;
  progress?: Progress;
  progressOutput?: BASE64 | TENSOR;
}

export interface WarmupArgs extends SharedArgs {}

export interface PrivateUpscaleArgs extends Omit<UpscaleArgs, 'output' | 'progressOutput'> {
  output: BASE64 | TENSOR;
  progressOutput: BASE64 | TENSOR;
}

// ─── Internals: the dependency-injection seam that parallels the tfjs one ─
export type CheckValidEnvironment<I> = (input: I, opts: { output?: ResultFormat; progressOutput?: ResultFormat; }) => void;
export type GetImageAsTensor<I> = (input: I) => Promise<Tensor>;
export type TensorAsBase64 = (t: Tensor) => string;
export type LoadModel = (def: Promise<ModelDefinition>) => Promise<ModelPackage>;
export type GetUpscaleOptions = (args?: Omit<UpscaleArgs, 'output' | 'progressOutput'> & { output?: unknown; progressOutput?: unknown; }) => PrivateUpscaleArgs;

export interface InternalConfig<I> {
  checkValidEnvironment: CheckValidEnvironment<I>;
  getImageAsTensor: GetImageAsTensor<I>;
  tensorAsBase64: TensorAsBase64;
}

export interface Internals<I> extends InternalConfig<I> {
  getUpscaleOptions: GetUpscaleOptions;
  loadModel: LoadModel;
}
