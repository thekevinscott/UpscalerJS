import { getUpscaler, } from '../shared';
import * as tf from '@tensorflow/tfjs-node';
export * from '../shared';
import { getUpscaleOptions, } from './args.node';
import { loadModel, } from './loadModel.node';
import {
  getImageAsTensor,
  tensorAsBase64,
  checkValidEnvironment,
  Input,
} from './image.node';

const Upscaler = getUpscaler<typeof tf, Input>({
  tf,
  getUpscaleOptions,
  loadModel,
  getImageAsTensor,
  tensorAsBase64,
  checkValidEnvironment,
});

export default Upscaler;
