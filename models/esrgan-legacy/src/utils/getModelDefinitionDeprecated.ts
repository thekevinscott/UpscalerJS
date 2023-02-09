import { ModelDefinition, } from '@upscalerjs/core';
import { NAME, VERSION, } from '../constants.generated';

const _getModelDefinitionDEPRECATED = (scale: 2 | 3 | 4, modelPath: string): ModelDefinition => ({
  scale,
  path: `models/${modelPath}/model.json`,
  packageInformation: {
    name: NAME,
    version: VERSION,
  },
  meta: {
    dataset: 'div2k',
  },
  inputRange: [0, 255,],
  outputRange: [0, 255,],
});

export default _getModelDefinitionDEPRECATED;

