import { getUpscaler, } from '../core/index.js';
import * as tf from '@tensorflow/tfjs';
export * from '../core/index.js';
import { getUpscaleOptions, } from './args.browser.js';
import { loadModel, } from './loadModel.browser.js';
import {
  getImageAsTensor,
  tensorAsBase64,
  checkValidEnvironment,
  Input,
} from './image.browser.js';

export default getUpscaler<typeof tf, Input>({
  tf,
  getUpscaleOptions,
  loadModel,
  getImageAsTensor,
  tensorAsBase64,
  checkValidEnvironment,
});
