import { NAME, VERSION, } from '../constants.generated';
import { getMaximDefinition, } from '../../../../packages/shared/src/maxim/maxim';

export default getMaximDefinition({
  path: 'models/deblurring/256/model.json',
  name: NAME,
  version: VERSION,
  meta: {
    dataset: 'GoPro',
    quantization: 'float16',
    inputSize: 256,
  },
});
