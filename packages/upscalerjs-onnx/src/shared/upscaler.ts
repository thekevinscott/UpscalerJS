/**
 * # Upscaler (ONNX Runtime edition)
 *
 * Public API — intentionally byte-for-byte compatible with
 * `packages/upscalerjs/src/shared/upscaler.ts`:
 *
 * ```ts
 * import Upscaler from '@upscalerjs/onnx';
 * const upscaler = new Upscaler({ model: realEsrganX4 });
 * const src = await upscaler.upscale(img, { patchSize: 64, padding: 2 });
 * ```
 *
 * **Every public method + signature here matches the tfjs Upscaler.**
 * `execute`, `upscale`, `warmup`, `abort`, `dispose`, `getModel`, `ready`
 * all behave the same.
 *
 * Differences a user can observe:
 *
 *   - `upscaler.getModel()` returns an `InferenceSession` rather than a
 *     `tf.LayersModel | tf.GraphModel`. This is unavoidable.
 *   - `dispose()` calls `session.release()` in place of `model.dispose()`.
 *   - Errors thrown during model load now come from `onnxruntime-*` rather
 *     than `tf.io.*`.
 *
 * Differences a user can *not* observe (but model authors must know about):
 *
 *   - `ModelDefinition.preprocess` / `postprocess` take our `Tensor`, not a
 *     `tf.Tensor4D`. See MIGRATION.md.
 */
import type {
  UpscalerOptions, ModelPackage, UpscaleArgs, WarmupArgs, WarmupSizes,
  Internals, MultiArgStringProgress, MultiArgTensorProgress, BASE64, TENSOR,
} from './types';
import { Tensor, } from './tensor';
import { getModel, } from './model-utils';
import { upscale, } from './upscale';
import { warmup as runWarmup, } from './warmup';

export function getUpscaler<Input>({
  getUpscaleOptions, checkValidEnvironment, getImageAsTensor, tensorAsBase64, loadModel,
}: Internals<Input>) {
  class Upscaler {
    /** @hidden */ _opts: UpscalerOptions;
    /** @hidden */ _model: Promise<ModelPackage>;
    /** @hidden */ _abortController = new AbortController();
    /** Resolves once the model has loaded and completed warmup. */
    ready: Promise<void>;

    constructor(opts: UpscalerOptions = {}) {
      this._opts = { ...opts, };
      // `DefaultUpscalerModel` — the tfjs package defaults to
      // `@upscalerjs/default-model`. In the ONNX world that package doesn't
      // exist yet; requiring an explicit `model` is a reasonable interim
      // while an ONNX default is settled on.
      if (!this._opts.model) {
        throw new Error('[@upscalerjs/onnx] `model` is required — no default ONNX model is bundled yet. See README.');
      }
      this._model = loadModel(getModel(this._opts.model));
      this.ready = this._model
        .then(() => runWarmup(this._model, this._opts.warmupSizes ?? [], undefined, { signal: this._abortController.signal, }))
        .catch((err) => { throw err; });
    }

    // ── Overloads mirror the tfjs Upscaler's execute() surface ────────────
    public async execute(
      image: Input,
      options: Omit<UpscaleArgs, 'output' | 'progress' | 'progressOutput'> & { output: TENSOR; progress?: MultiArgStringProgress; progressOutput: BASE64; },
    ): Promise<Tensor>;
    public async execute(
      image: Input,
      options: Omit<UpscaleArgs, 'output' | 'progress' | 'progressOutput'> & { output?: BASE64; progress?: MultiArgTensorProgress; progressOutput: TENSOR; },
    ): Promise<string>;
    public async execute(
      image: Input,
      options: Omit<UpscaleArgs, 'output' | 'progress' | 'progressOutput'> & { output: TENSOR; progress?: MultiArgTensorProgress; progressOutput?: unknown; },
    ): Promise<Tensor>;
    public async execute(
      image: Input,
      options: Omit<UpscaleArgs, 'output' | 'progress' | 'progressOutput'> & { output?: BASE64; progress?: MultiArgStringProgress; progressOutput?: unknown; },
    ): Promise<string>;
    public async execute(image: Input): Promise<string>;
    public async execute(
      image: Input,
      options?: UpscaleArgs,
    ): Promise<Tensor | string> {
      await this.ready;
      const modelPackage = await this._model;
      return upscale(
        image,
        getUpscaleOptions(options),
        modelPackage,
        { checkValidEnvironment, getImageAsTensor, tensorAsBase64, },
        this._abortController.signal,
      );
    }

    /** Alias for `execute`. */
    upscale = this.execute.bind(this);

    warmup = async (warmupSizes: WarmupSizes = [], opts?: WarmupArgs): Promise<void> => {
      await this.ready;
      return runWarmup(this._model, warmupSizes, opts, { signal: this._abortController.signal, });
    };

    abort = (): void => {
      this._abortController.abort();
      this._abortController = new AbortController();
    };

    dispose = async (): Promise<void> => {
      await this.ready;
      const { model, } = await this._model;
      // `InferenceSession.release()` is the ORT equivalent of `model.dispose()`.
      await model.release();
    };

    getModel = (): Promise<ModelPackage> => this._model;
  }

  return Upscaler;
}
