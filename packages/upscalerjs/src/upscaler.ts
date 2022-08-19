import { ESRGANSlim, } from './dependencies.generated';
import type {
  UpscalerOptions,
  TempUpscaleArgs,
  WarmupSizes,
  ResultFormat,
  Progress,
  UpscaleResponse,
  ModelPackage,
  BASE64,
  UpscaleArgs,
} from './types';
import { loadModel, } from './loadModel.generated';
import { warmup, } from './warmup';
import { cancellableUpscale, } from './upscale';
import type { GetImageAsTensorInput, } from './image.generated';
import type { ModelDefinitionObjectOrFn, } from '@upscalerjs/core';
import { getModel, parseUpscaleOptions, } from './utils';

// TODO: Why do we need to explicitly cast this to ModelDefinition?
// This is an ESLint issue, Typescript picks this up correctly
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
const DEFAULT_MODEL: ModelDefinitionObjectOrFn = ESRGANSlim;

export class Upscaler {
  _opts: UpscalerOptions;
  _model: Promise<ModelPackage>;
  abortController = new AbortController();

  constructor(opts: UpscalerOptions = {}) {
    this._opts = {
      ...opts,
    };
    this._model = loadModel(getModel(this._opts.model || DEFAULT_MODEL));
    void warmup(this._model, this._opts.warmupSizes || []);
  }

  dispose = async (): Promise<void> => {
    const { model, } = await this._model;
    model.dispose();
  };

  getModel = (): Promise<ModelPackage> => this._model;
  warmup = async (warmupSizes: WarmupSizes[]): Promise<void> => {
    await warmup(this._model, warmupSizes);
  };

  upscale = async<P extends Progress<O, PO>, O extends ResultFormat = BASE64, PO extends ResultFormat = undefined>(
    image: GetImageAsTensorInput,
    options: TempUpscaleArgs<P, O, PO> = {},
  ): Promise<UpscaleResponse<O>> => {
    const { model, modelDefinition, } = await this._model;
    const parsedOptions: UpscaleArgs<P, O, PO> = parseUpscaleOptions<P, O, PO>(options);
    return cancellableUpscale(image, parsedOptions, {
      model,
      modelDefinition,
      signal: this.abortController.signal,
    });
  };

  abort = (): void => {
    this.abortController.abort();
    this.abortController = new AbortController();
  };
}

export default Upscaler;
