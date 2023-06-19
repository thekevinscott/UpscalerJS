import { NAME, VERSION, } from '../constants.generated';
import { getMaximDefinition, } from '../../../../packages/shared/src/maxim/maxim';

export default getMaximDefinition({
  path: 'models/deraining/64/model.json',
  name: NAME,
  version: VERSION,
  meta: {
    dataset: 'Rain13k',
    quantization: 'uint8',
    inputSize: 64,
  },
});
