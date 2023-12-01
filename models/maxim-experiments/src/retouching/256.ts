import { NAME, VERSION, } from '../constants.generated';
import { getMaximDefinition, } from '../../../../packages/shared/src/maxim/maxim';

export default getMaximDefinition({
  path: 'models/retouching/256/model.json',
  name: NAME,
  version: VERSION,
  meta: {
    dataset: 'FiveK',
    quantization: 'float16',
    inputSize: 256,
  },
});
