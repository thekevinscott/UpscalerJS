import { getUpscaler, } from '../shared/index';
import * as tf from '@tensorflow/tfjs-node-gpu';
export * from '../shared/index';
import { getUpscaleOptions, } from '../node/args.node';
import { loadModel, } from '../node/loadModel.node';
import {
  getImageAsTensor,
  tensorAsBase64,
  checkValidEnvironment,
  Input,
} from '../node/image.node';

const Upscaler = getUpscaler<typeof tf, Input>({
  tf,
  getUpscaleOptions,
  loadModel,
  getImageAsTensor,
  tensorAsBase64,
  checkValidEnvironment,
});

export default Upscaler;
