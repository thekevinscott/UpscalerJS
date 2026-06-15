import { getUpscaler, } from '../core/index.js';
import * as tf from '@tensorflow/tfjs-node';
export * from '../core/index.js';
import { getUpscaleOptions, } from './args.node.js';
import { loadModel, } from './loadModel.node.js';
import {
  getImageAsTensor,
  tensorAsBase64,
  checkValidEnvironment,
  Input,
} from './image.node.js';

const Upscaler = getUpscaler<typeof tf, Input>({
  tf,
  getUpscaleOptions,
  loadModel,
  getImageAsTensor,
  tensorAsBase64,
  checkValidEnvironment,
});

export default Upscaler;
