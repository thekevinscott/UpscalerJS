import { getUpscaler, } from '../core/index.js';
import * as tf from '@tensorflow/tfjs-node-gpu';
export * from '../core/index.js';
import { getUpscaleOptions, } from '../node/args.node.js';
import { loadModel, } from '../node/loadModel.node.js';
import {
  getImageAsTensor,
  tensorAsBase64,
  checkValidEnvironment,
  Input,
} from '../node/image.node.js';

const Upscaler = getUpscaler<typeof tf, Input>({
  tf,
  getUpscaleOptions,
  loadModel,
  getImageAsTensor,
  tensorAsBase64,
  checkValidEnvironment,
});

export default Upscaler;
