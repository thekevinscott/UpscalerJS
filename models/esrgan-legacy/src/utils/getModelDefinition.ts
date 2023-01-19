import { ModelDefinition, } from '@upscalerjs/core';
import { NAME, VERSION, } from '../constants.generated';

const getModelDefinition = (scale: 2 | 3 | 4, modelPath: string, extra: Partial<ModelDefinition> = {}): ModelDefinition => ({
  scale,
  path: `models/${modelPath}/model.json`,
  packageInformation: {
    name: NAME,
    version: VERSION,
  },
  meta: {
    dataset: 'div2k',
  },
  ...extra,
});

export default getModelDefinition;

