import Upscaler from './upscaler';
import { getRowsAndColumns, getTensorDimensions } from './upscale';

(Upscaler as typeof Upscaler & {
  getRowsAndColumns: typeof getRowsAndColumns;
}).getRowsAndColumns = getRowsAndColumns;
(Upscaler as typeof Upscaler & {
  getTensorDimensions: typeof getTensorDimensions;
}).getTensorDimensions = getTensorDimensions;

export default Upscaler;
