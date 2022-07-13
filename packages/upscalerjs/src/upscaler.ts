import { tf, ESRGANSlim, } from './dependencies.generated';
import type {
  UpscalerOptions,
  UpscaleArgs,
  WarmupSizes,
  ResultFormat,
  Progress,
} from './types';
import type { ModelDefinition, } from "@upscalerjs/core";
import { loadModel, } from './loadModel.generated';
import warmup from './warmup';
import { cancellableUpscale, } from './upscale';
import type { GetImageAsTensorInput, } from './image.generated';
import type { ModelDefinitionFn, ModelDefinitionObjectOrFn, } from '@upscalerjs/core';
// import { isModelDefinitionFn, } from '@upscalerjs/core';
export function isModelDefinitionFn (modelDefinition: ModelDefinitionObjectOrFn): modelDefinition is ModelDefinitionFn { return typeof modelDefinition === 'function'; }

// TODO: Why do we need to explicitly cast this to ModelDefinition?
// For some reason, TS is picking this up as *any* even though in the editor
// it's defined as ModelDefinition
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
const DEFAULT_MODEL: ModelDefinitionFn = ESRGANSlim;

const getModel = (modelDefinition: ModelDefinitionObjectOrFn = DEFAULT_MODEL) => {
  /* eslint-disable @typescript-eslint/no-unsafe-call */
  /* eslint-disable @typescript-eslint/no-unsafe-return */
  return isModelDefinitionFn(modelDefinition) ? modelDefinition(tf) : modelDefinition;
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
