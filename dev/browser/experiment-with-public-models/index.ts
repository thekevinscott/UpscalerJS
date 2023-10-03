import * as tf from '@tensorflow/tfjs';
import Upscaler, { ModelDefinition } from '../../../packages/upscalerjs/src/shared/index';

const model: ModelDefinition = {
  path: './1/model.json',
  modelType: 'graph',
  scale: 1,
};

const upscaler = new Upscaler({
  model,
})
