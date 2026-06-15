import Upscaler from '..';
import { AbortError, } from '../../core/errors-and-warnings.js';
import { getPatchesFromImage, } from '../../core/image-utils.js';

(
  Upscaler as typeof Upscaler & {
    getPatchesFromImage: typeof getPatchesFromImage;
  }
).getPatchesFromImage = getPatchesFromImage;
(
  Upscaler as typeof Upscaler & {
    AbortError: typeof AbortError;
  }
).AbortError = AbortError;

export default Upscaler;
