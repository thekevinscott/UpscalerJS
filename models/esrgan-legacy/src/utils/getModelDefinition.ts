import { ModelDefinition, PostProcess, } from '@upscalerjs/core';
import { NAME, VERSION, } from '../constants.generated';

const getModelDefinition = (scale: 2 | 3 | 4, modelPath: string, postprocess?: PostProcess): ModelDefinition => ({
  scale,
  channels: 3,
  path: `models/${modelPath}/model.json`,
  packageInformation: {
    name: NAME,
    version: VERSION,
  },
  meta: {
    dataset: 'div2k',
  },
  postprocess,
});

export default getModelDefinition;

