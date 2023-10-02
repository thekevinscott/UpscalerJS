const _Upscaler = require('../../shared/index').default; // eslint-disable-line

import * as tf from '@tensorflow/tfjs-node-gpu';
export * from '../shared';
import { getUpscaleOptions, } from '../node/args.node';
import { loadModel, } from '../node/loadModel.node';
import {
  getImageAsTensor,
  tensorAsBase64,
  checkValidEnvironment,
  Input,
} from '../node/image.node';

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

module.exports = Upscaler;
