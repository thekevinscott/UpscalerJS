import { tf, } from './dependencies.generated';
import {
  IUpscalerOptions,
  IUpscaleOptions,
  WarmupSizes,
  IModelDefinition,
  ReturnType,
  Progress,
} from './types';
import loadModel, { getModelDefinitions, } from './loadModel';
import warmup from './warmup';
import upscale from './upscale';
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

  upscale = async<P extends Progress<O, PO>, O extends ReturnType = 'src', PO extends ReturnType = undefined>(
    image: GetImageAsTensorInput,
    options: IUpscaleOptions<P, O, PO> = {},
  ) => {
    const { model, modelDefinition, } = await this._model;
    return upscale(model, image, modelDefinition, options);
  };

  getModelDefinitions = async () => {
    return await getModelDefinitions();
  };
}

export default Upscaler;
