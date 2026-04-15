/**
 * Browser entry point for `@upscalerjs/onnx`.
 *
 * Mirrors `packages/upscalerjs/src/browser/index.ts` — the factory pattern
 * is the key reason the tfjs codebase was easy to retarget. We just plug
 * browser-flavoured primitives into the same `getUpscaler()` factory.
 */
import { getUpscaler, } from '../shared';
import { getUpscaleOptions, } from './args.browser';
import { loadModel, } from './loadModel.browser';
import {
  getImageAsTensor,
  tensorAsBase64,
  checkValidEnvironment,
  type Input,
} from './image.browser';

export * from '../shared';

export default getUpscaler<Input>({
  getUpscaleOptions,
  loadModel,
  getImageAsTensor,
  tensorAsBase64,
  checkValidEnvironment,
});
