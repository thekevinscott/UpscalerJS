import { tf, ESRGANSlim, } from './dependencies.generated';
import type {
  UpscalerOptions,
  UpscaleArgs,
  WarmupSizes,
  ResultFormat,
  Progress,
} from './types';
import { loadModel, } from './loadModel.generated';
import warmup from './warmup';
import { cancellableUpscale, } from './upscale';
import type { GetImageAsTensorInput, } from './image.generated';
import type { ModelDefinition, } from '@upscalerjs/core';

// TODO: Why do we need to explicitly cast this to ModelDefinition?
// For some reason, TS is picking this up as *any* even though in the editor
// it's defined as ModelDefinition
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
const DEFAULT_MODEL = ESRGANSlim as ModelDefinition;

const getModel = (modelDefinition: ModelDefinition = DEFAULT_MODEL) => {
  return modelDefinition;
};

export class Upscaler {
  _opts: UpscalerOptions;
  _model: Promise<{
    model: tf.LayersModel;
    modelDefinition: ModelDefinition;
  }>;
  abortController = new AbortController();

  constructor(opts: UpscalerOptions = {}) {
    this._opts = {
      ...opts,
    };
    this._model = loadModel(getModel(this._opts.model));
    void warmup(this._model, this._opts.warmupSizes || []);
  }

  dispose = async () => {
    const { model, } = await this._model;
    model.dispose();
  };

  getModel = () => this._model;
  warmup = async (warmupSizes: WarmupSizes[]) => {
    await warmup(this._model, warmupSizes);
  };

  upscale = async<P extends Progress<O, PO>, O extends ResultFormat = 'src', PO extends ResultFormat = undefined>(
    image: GetImageAsTensorInput,
    options: UpscaleArgs<P, O, PO> = {},
  ) => {
    const { model, modelDefinition, } = await this._model;
    return cancellableUpscale(image, options, {
      model,
      modelDefinition,
      signal: this.abortController.signal,
    });
  };

  abort = () => {
    this.abortController.abort();
    this.abortController = new AbortController();
  };
}

export default Upscaler;
