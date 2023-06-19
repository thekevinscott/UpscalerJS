import { NAME, VERSION, } from '../constants.generated';
import { getMaximDefinition, } from '../../../../packages/shared/src/maxim/maxim';

export default getMaximDefinition({
  path: 'models/dehazing-indoor/64/model.json',
  name: NAME,
  version: VERSION,
  meta: {
    dataset: 'RESIDE-Indoor',
    quantization: 'uint8',
    inputSize: 64,
  },
});
