import { getUpscaler, } from '../shared';
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

export default getUpscaler<typeof tf, Input>({
    tf,
    getUpscaleOptions,
    loadModel,
    getImageAsTensor,
    tensorAsBase64,
    checkValidEnvironment,
});
