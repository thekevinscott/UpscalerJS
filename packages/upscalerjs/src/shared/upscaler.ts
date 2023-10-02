/**
 * # UpscalerJS class
 * 
 * Instantiate an Upscaler with:
 * 
 * ```typescript
 * import Upscaler from 'upscaler';
 * const upscaler = new Upscaler();
 * upscaler.execute(img).then(src => {
 *   // display the src
 * });
 * ```
 *
 * @module UpscalerJS
 */
import type { Tensor3D, } from '@tensorflow/tfjs-core';
import DefaultUpscalerModel from '@upscalerjs/default-model';
import type {
  UpscalerOptions,
  ModelPackage,
  BASE64,
  WarmupArgs,
  UpscaleArgs,
  TENSOR,
  MultiArgStringProgress,
  MultiArgTensorProgress,
  WarmupSizes,
  Internals,
  InternalConfig,
  CheckValidEnvironment,
} from './types';
import { cancellableWarmup, } from './warmup';
import { cancellableUpscale, } from './upscale';
import type { TF, ModelDefinitionObjectOrFn, } from '@upscalerjs/core';
import { getModel, } from './model-utils';

// TODO: Why do we need to explicitly cast this to ModelDefinition?
// This is an ESLint issue, Typescript picks this up correctly
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
const DEFAULT_MODEL: ModelDefinitionObjectOrFn = DefaultUpscalerModel;

export class Upscaler<T extends TF, Input>{
  /**
   * @hidden
   */
  protected internals?: Internals<T, Input>;

  /**
   * @hidden
   */
  _opts: UpscalerOptions;

  /**
   * @hidden
   */
  _model: Promise<ModelPackage>;

  /**
   * Resolves once the model is loaded and warmed up.
   * If there is an error during model load, that error will be exposed on this promise.
   */
  ready: Promise<void>;

  /**
   * @hidden
   */
  _abortController = new AbortController();

  getInternal<K extends keyof Internals<T, Input>>(key: K): Internals<T, Input>[K] {
    if (!this.internals) {
      throw new Error('Internals not set');
    }
    return this.internals[key];
  }

  /**
   * Instantiates an instance of UpscalerJS.
   * 
   * ```javascript
   * import Upscaler from 'upscaler';
   * import x2 from '@upscalerjs/models/esrgan-thick/2x';
   * 
   * const upscaler = new Upscaler({
   *   model: x2,
   *   warmupSizes: { patchSize: 64 },
   * });
   * ```
   * 
   * @returns an instance of an UpscalerJS class.
   */
  constructor(opts: UpscalerOptions = {}) {
    this._opts = {
      ...opts,
    };
    const tf = this.getInternal('tf');
    const loadModel = this.getInternal('loadModel');
    this._model = loadModel(tf, getModel(tf, this._opts.model || DEFAULT_MODEL));
    this.ready = new Promise((resolve, reject) => {
      this._model.then(() => cancellableWarmup(
        tf,
        this._model,
        (this._opts.warmupSizes || []),
        undefined,
        {
          signal: this._abortController.signal,
        },
      )).then(resolve).catch(reject);
    });
  }


  /**
   * Processes a given image through a specified neural network. 
   * 
   * Alias for [`upscale`](upscale).
   * 
   * ```javascript
   * const upscaler = new Upscaler();
   * const image = new Image();
   * image.src = '/some/path/to/image.png';
   * 
   * upscaler.execute(image, {
   *   output: 'base64',
   *   patchSize: 64,
   *   padding: 2,
   *   progress: (progress) => {
   *     console.log('Progress:', progress);
   *   },
   * }).then(enhancedSrc => {
   *   console.log(enhancedSrc);
   * });
   * ```
   *
   * @param image The image to enhance
   * @param options A set of enhancing arguments.
   * @returns an enhanced image.
   */
  public async execute(
    image: Input,
    options: Omit<UpscaleArgs, 'output' | 'progress' | 'progressOutput'> & { output: TENSOR; progress?: MultiArgStringProgress; progressOutput: BASE64 },
  ): Promise<Tensor3D>;
  public async execute(
    image: Input,
    options: Omit<UpscaleArgs, 'output' | 'progress' | 'progressOutput'> & { output?: BASE64; progress?: MultiArgTensorProgress; progressOutput: TENSOR },
  ): Promise<string>;
  public async execute(
    image: Input,
    options: Omit<UpscaleArgs, 'output' | 'progress' | 'progressOutput'> & { output: TENSOR; progress?: MultiArgTensorProgress; progressOutput?: unknown },
  ): Promise<Tensor3D>;
  public async execute(
    image: Input,
    options: Omit<UpscaleArgs, 'output' | 'progress' | 'progressOutput'> & { output?: BASE64; progress?: MultiArgStringProgress; progressOutput?: unknown },
  ): Promise<string>;
  public async execute(
    image: Input,
    options: Omit<UpscaleArgs, 'output' | 'progress' | 'progressOutput'> & { output?: TENSOR | BASE64; progress?: MultiArgStringProgress | MultiArgTensorProgress; progressOutput?: unknown },
  ): Promise<Tensor3D | string>;
  public async execute(
    image: Input,
  ): Promise<string>;
  public async execute(
    image: Input,
    options?: Omit<UpscaleArgs, 'output' | 'progress' | 'progressOutput'> & { output?: unknown; progress?: MultiArgStringProgress | MultiArgTensorProgress; progressOutput?: unknown },
  ) {
    const tf = this.getInternal('tf');
    const getUpscaleOptions = this.getInternal('getUpscaleOptions');
    const checkValidEnvironment = this.getInternal('checkValidEnvironment');
    const getImageAsTensor = this.getInternal('getImageAsTensor');
    const tensorAsBase64 = this.getInternal('tensorAsBase64');
    const internals: InternalConfig<T, Input> = {
      checkValidEnvironment: checkValidEnvironment as unknown as CheckValidEnvironment<Input>,
      getImageAsTensor,
      tensorAsBase64,
    };
    await this.ready;
    const modelPackage = await this._model;
    return cancellableUpscale(tf, image, getUpscaleOptions(options), {
      ...modelPackage,
      signal: this._abortController.signal,
    }, internals);
  }

  /**
   * Alias for execute.
   */
  upscale = this.execute.bind(this);

  /**
   * Warms up an Upscaler instance. For more info, [see the guide on warming up](/documentation/guides/browser/performance/warmup).
   * 
   * ```javascript
   * const upscaler = new Upscaler();
   * upscaler.warmup([{
   *   patchSize: 64,
   *   padding: 2,
   * }]).then(() => {
   *   console.log('All warmed up!');
   * });
   * ```
   * 
   * @param warmupSizes Denotes how to warm the model up.
   * @param options A set of warm up arguments.
   */
  warmup = async (warmupSizes: WarmupSizes = [], options?: WarmupArgs): Promise<void> => {
    await this.ready;
    const tf = this.getInternal('tf');
    return cancellableWarmup(
      tf,
      this._model,
      warmupSizes,
      options, {
        signal: this._abortController.signal,
      },
    );
  };

  /**
   * Aborts all active asynchronous methods (including execution and warm up methods). For more info, [see the guide on cancelling](/documentation/guides/browser/usage/cancel).
   * 
   * ```javascript
   * const upscaler = new Upscaler();
   * upscaler.abort();
   * ```
   */
  abort = (): void => {
    this._abortController.abort();
    this._abortController = new AbortController();
  };

  /**
   * Disposes of an UpscalerJS instance and clears up any used memory. Ensure any active execution events have first been aborted before disposing of the model.
   * 
   * ```javascript
   * const upscaler = new Upscaler();
   * upscaler.dispose().then(() => {
   *   console.log("All cleaned up!");
   * })
   * ```
   */
  dispose = async (): Promise<void> => {
    await this.ready;
    const { model, modelDefinition, } = await this._model;
    if (modelDefinition.teardown) {
      const tf = this.getInternal('tf');
      await modelDefinition.teardown(tf);
    }
    model.dispose();
  };

  /**
   * Gets a model package.
   * 
   * ```javascript
   * const upscaler = new Upscaler();
   * upscaler.getModel().then(modelPackage => {
   *   console.log(modelPackage);
   * })
   * ```
   * 
   * @returns a modelPackage object of shape ```{ model: tf.LayersModel, modelDefinition: ModelDefinition }```
   */
  getModel = (): Promise<ModelPackage> => this._model;
}

export default Upscaler;
