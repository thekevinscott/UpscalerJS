import * as tf from '@tensorflow/tfjs';
import {
  IUpscalerOptions,
  IUpscaleOptions,
  WarmupSizes,
  IModelDefinition,
} from './types';
import loadModel, { getModelDefinitions } from './loadModel';
import warmup from './warmup';
import upscale from './upscale';

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
    warmup(this._model, this._opts.warmupSizes || []);
  }

  getModel = () => this._model;
  warmup = async (warmupSizes: WarmupSizes) => {
    await warmup(this._model, warmupSizes);
  };

  upscale = async (
    image: string | HTMLImageElement | tf.Tensor3D,
    options: IUpscaleOptions = {},
  ) => {
    const { model, modelDefinition } = await this._model;
    return upscale(model, image, modelDefinition.scale, options);
  };

  getModelDefinitions = () => {
    return getModelDefinitions();
  };
}

export default Upscaler;
