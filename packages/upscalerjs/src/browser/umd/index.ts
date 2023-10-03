import Upscaler from '../';
import { AbortError, } from '../../shared/errors-and-warnings';
import { getPatchesFromImage, } from '../../shared/image-utils';

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
