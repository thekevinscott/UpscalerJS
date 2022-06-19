import { tf, } from './dependencies.generated';
import {
  UpscalerOptions,
  UpscaleArgs,
  WarmupSizes,
  ModelDefinition,
  ResultFormat,
  Progress,
} from './types';
import { loadModel, } from './loadModel.generated';
import warmup from './warmup';
import { cancellableUpscale, } from './upscale';
import type { GetImageAsTensorInput, } from './image.generated';
// import ESRGANSlim from '@upscalerjs/esrgan-legacy';

// const DEFAULT_MODEL = ESRGANSlim;

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
    // this._model = loadModel(this._opts.model || DEFAULT_MODEL);
    this._model = loadModel(this._opts.model as ModelDefinition);
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
