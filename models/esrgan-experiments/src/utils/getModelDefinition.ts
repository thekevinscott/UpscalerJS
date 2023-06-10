import { Scale, getESRGANModelDefinition, } from '../../../../packages/shared/src/esrgan';
import { ModelDefinitionFn, } from '@upscalerjs/core';
import { NAME, VERSION, } from '../constants.generated';

const getModelDefinition = (scale: Scale, architecture: string, modelPath: string, meta = {}): ModelDefinitionFn => getESRGANModelDefinition({
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
