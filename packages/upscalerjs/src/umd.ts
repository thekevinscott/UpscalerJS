import { Upscaler, } from './upscaler';
import { getRowsAndColumns, } from './upscale';
import { AbortError, } from './errors-and-warnings';
import { getTensorDimensions, } from './tensor-utils';

(
  Upscaler as typeof Upscaler & {
    getRowsAndColumns: typeof getRowsAndColumns;
  }
).getRowsAndColumns = getRowsAndColumns;
(
  Upscaler as typeof Upscaler & {
    getTensorDimensions: typeof getTensorDimensions;
  }
).getTensorDimensions = getTensorDimensions;
(
  Upscaler as typeof Upscaler & {
    AbortError: typeof AbortError;
  }
).AbortError = AbortError;

export default Upscaler;
