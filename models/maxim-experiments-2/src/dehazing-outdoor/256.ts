import { NAME, VERSION, } from '../constants.generated';
import { getMaximDefinition, } from '../../../../packages/shared/src/maxim/maxim';

export default getMaximDefinition({
  path: 'models/dehazing-outdoor/256/model.json',
  name: NAME,
  version: VERSION,
  meta: {
    dataset: 'RESIDE-Outdoor',
    quantization: 'uint16',
    inputSize: 256,
  },
});
