import { tf, } from './dependencies.generated';
import {
  IUpscalerOptions,
  UpscaleArgs,
  WarmupSizes,
  IModelDefinition,
  ResultFormat,
  Progress,
} from './types';
import loadModel, { getModelDefinitions, } from './loadModel';
import warmup from './warmup';
import { cancellableUpscale } from './upscale';
import type { GetImageAsTensorInput, } from './image.generated';

export class Upscaler {
  _opts: IUpscalerOptions;
  _model: Promise<{
    model: tf.LayersModel;
    modelDefinition: IModelDefinition;
  }>;
  abortController = new AbortController();

  constructor(opts: IUpscalerOptions = {}) {
    this._opts = {
      ...opts,
    };
    this._model = loadModel(this._opts);
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

  getModelDefinitions = async () => {
    return await getModelDefinitions();
  };

  abort = () => {
    this.abortController.abort();
    this.abortController = new AbortController();
  }
}

export default Upscaler;
