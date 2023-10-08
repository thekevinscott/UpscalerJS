import type { ModelDefinition, } from '../../../../packages/shared/src/types';
import { getESRGANModelDefinition, } from '../../../../packages/shared/src/esrgan/esrgan';
import { NAME, VERSION, } from '../constants.generated';

const SCALE = 4;

const modelDefinition: ModelDefinition = getESRGANModelDefinition({
  scale: SCALE,
  path: 'models/gans/model.json',
  name: NAME,
  version: VERSION,
  meta: {
    dataset: 'div2k',
    architecture: "rrdn",
  },
});

export default modelDefinition;
