/**
 * # UpscalerJS class
 * 
 * Instantiate an Upscaler with:
 * 
 * ```typescript
 * import Upscaler from 'upscaler';
 * const upscaler = new Upscaler();
 * upscaler.upscale(img).then(src => {
 *   // display the src
 * });
 * ```
 *
 * @module UpscalerJS
 */
import { DefaultUpscalerModel, } from './dependencies.generated';
import type {
  UpscalerOptions,
  WarmupSizes,
  ResultFormat,
  Progress,
  UpscaleResponse,
  ModelPackage,
  BASE64,
  PrivateUpscaleArgs,
  WarmupArgs,
  PublicUpscaleArgs,
} from './types';
import { getUpscaleOptions, } from './args.generated';
import { loadModel, } from './loadModel.generated';
import { cancellableWarmup, } from './warmup';
import { cancellableUpscale, } from './upscale';
import type { GetImageAsTensorInput, } from './image.generated';
import type { ModelDefinitionObjectOrFn, } from '@upscalerjs/core';
import { getModel, } from './utils';

// TODO: Why do we need to explicitly cast this to ModelDefinition?
// This is an ESLint issue, Typescript picks this up correctly
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
const DEFAULT_MODEL: ModelDefinitionObjectOrFn = DefaultUpscalerModel;

export class Upscaler {
  /**
   * @hidden
   */
  _opts: UpscalerOptions;

  /**
   * @hidden
   */
  _model: Promise<ModelPackage>;

  /**
   * @hidden
   */
  _ready: Promise<void>;

  /**
   * @hidden
   */
  _abortController = new AbortController();

  /**
   * Instantiates an instance of UpscalerJS.
   * 
   * ```javascript
   * import Upscaler from 'upscaler';
   * import x2 from '@upscalerjs/models/esrgan-thick/2x';
   * 
   * const upscaler = new Upscaler({
   *   model: x2,
   *   warmupSizes: [{ patchSize: 64 }],
   * });
   * ```
   * 
   * @returns an instance of an UpscalerJS class.
   */
  constructor(opts: UpscalerOptions = {}) {
    this._opts = {
      ...opts,
    };
    this._model = loadModel(getModel(this._opts.model || DEFAULT_MODEL));
    this._ready = new Promise<void>((resolve) => {
      void this.warmup(this._opts.warmupSizes).then(resolve); // skipcq: js-0098
    });
  }

  /**
   * Upscales a given image.
   * 
   * ```javascript
   * const upscaler = new Upscaler();
   * const image = new Image();
   * image.src = '/some/path/to/image.png';
   * 
   * upscaler.upscale(image, {
   *   output: 'base64',
   *   patchSize: 64,
   *   padding: 2,
   *   progress: (progress) => {
   *     console.log('Progress:', progress);
   *   },
   * }).then(upscaledSrc => {
   *   console.log(upscaledSrc);
   * });
   * ```
   *
   * @param image the image to upscale. If in the browser, this can be a string to a file path, a tensor, or any element tf.fromPixels supports. If in Node, this can be a string to a file path, a Buffer, a Uint8Array, or a tensor.
   * @param options a set of upscaling arguments
   * @returns an upscaled image.
   */
  upscale = async<P extends Progress<O, PO>, O extends ResultFormat = BASE64, PO extends ResultFormat = undefined>(
    image: GetImageAsTensorInput,
    options: PublicUpscaleArgs<P, O, PO> = {},
  ): Promise<UpscaleResponse<O>> => {
    await this._ready;
    const { model, modelDefinition, } = await this._model;
    return cancellableUpscale(image, getUpscaleOptions(options), {
      model,
      modelDefinition,
      signal: this._abortController.signal,
    });
  };

  /**
   * Warms up an upscaler instance.
   * 
   * ```javascript
   * const upscaler = new Upscaler();
   * upscaler.warmup([{
   *   patchSize: 64,
   * }]).then(() => {
   *   console.log('I am all warmed up!');
   * });
   * ```
   */
  warmup = async (warmupSizes: WarmupSizes[] = [], options?: WarmupArgs): Promise<void> => {
    await this._ready;
    return cancellableWarmup(this._model, warmupSizes, options, {
      signal: this._abortController.signal,
    });
  };

  /**
   * Aborts all active asynchronous methods (including upscaling and warm up methods).
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
   * Disposes of an UpscalerJS instance and clears up any used memory.
   * 
   * ```javascript
   * const upscaler = new Upscaler();
   * upscaler.dispose().then(() => {
   *   console.log("I'm all cleaned up!");
   * })
   * ```
   */
  dispose = async (): Promise<void> => {
    await this._ready;
    const [{ model, }, ] = await Promise.all([
      this._model,
      // this.abort(),
    ]);
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
