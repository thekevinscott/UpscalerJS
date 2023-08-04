import { ModelDefinition, } from '@upscalerjs/core';
import { Scale, getESRGANModelDefinition, } from '../../esrgan';
import { NAME, VERSION, } from '../constants.generated';

const getModelDefinition = (scale: Scale, architecture: string, modelPath: string, meta = {}): ModelDefinition => getESRGANModelDefinition({
  scale,
  path: modelPath,
  name: NAME,
  version: VERSION,
  meta: {
    ...meta,
    architecture,
  },
});

export default getModelDefinition;
