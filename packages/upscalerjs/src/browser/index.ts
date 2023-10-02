import _Upscaler from '../shared';
import * as tf from '@tensorflow/tfjs';
export * from '../shared';
import { getUpscaleOptions, } from './args.browser';
import { loadModel, } from './loadModel.browser';
import {
  getImageAsTensor,
  tensorAsBase64,
  checkValidEnvironment,
  Input,
} from './image.browser';

export class Upscaler extends _Upscaler<typeof tf, Input> {
  internals = {
    tf,
    getUpscaleOptions,
    loadModel,
    getImageAsTensor,
    tensorAsBase64,
    checkValidEnvironment,
  };
}
