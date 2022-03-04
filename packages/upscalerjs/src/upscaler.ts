import { tf, } from './dependencies.generated';
import {
  IUpscalerOptions,
  IUpscaleOptions,
  WarmupSizes,
  IModelDefinition,
  ResultFormat,
  Progress,
} from './types';
import loadModel, { getModelDefinitions, } from './loadModel';
import warmup from './warmup';
import { cancellableUpscale } from './upscale';
import type { GetImageAsTensorInput, } from './image.generated';

class Upscaler {
  _opts: IUpscalerOptions;
  _model: Promise<{
    model: tf.LayersModel;
    modelDefinition: IModelDefinition;
  }>;

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
    options: IUpscaleOptions<P, O, PO> = {},
  ) => {
    const { model, modelDefinition, } = await this._model;
    return cancellableUpscale(model, image, modelDefinition, options);
  };

  getModelDefinitions = async () => {
    return await getModelDefinitions();
  };
}

export default Upscaler;
