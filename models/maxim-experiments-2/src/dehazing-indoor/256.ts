import { NAME, VERSION, } from '../constants.generated';
import { getMaximDefinition, } from '../../../../packages/shared/src/maxim/maxim';

export default getMaximDefinition({
  path: 'models/dehazing-indoor/256/model.json',
  name: NAME,
  version: VERSION,
  meta: {
    dataset: 'RESIDE-Indoor',
    quantization: 'uint16',
    inputSize: 256,
  },
});
