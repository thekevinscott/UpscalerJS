import { NAME, VERSION, } from '../constants.generated';
import { getMaximDefinition, } from '../../../../packages/shared/src/maxim/maxim';

export default getMaximDefinition({
  path: 'models/enhancement/64/model.json',
  name: NAME,
  version: VERSION,
  meta: {
    dataset: 'LOL',
    quantization: 'uint8',
    inputSize: 64,
  },
});
