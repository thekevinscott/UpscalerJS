import Upscaler, { ModelDefinition } from '../../../packages/upscalerjs/src/browser/esm/index.js';

const model: ModelDefinition = {
  path: './1/model.json',
  modelType: 'graph',
  scale: 1,
};

const upscaler = new Upscaler({
  model,
})
