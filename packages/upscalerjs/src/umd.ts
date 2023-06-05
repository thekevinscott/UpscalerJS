import { Upscaler, } from './upscaler';
import { AbortError, } from './errors-and-warnings';
import { getPatchesFromImage, } from './image-utils';

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
