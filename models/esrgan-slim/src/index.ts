import * as tfc from '@tensorflow/tfjs-core';
import type * as _tf from '@tensorflow/tfjs-node';
import type { ModelDefinition, } from '@upscalerjs/core';
import { NAME, VERSION, } from './constants.generated';

const modelDefinition = (tf: typeof _tf) => {
  const Layer = tf.layers.Layer;
  const SCALE = 4;
  const BETA = 0.2;

  type Inputs = tfc.Tensor4D | tfc.Tensor4D[];

  const isTensorArray = (inputs: Inputs): inputs is tfc.Tensor4D[] => {
    return Array.isArray(inputs);
  };

  const getInput = (inputs: Inputs): tfc.Tensor4D => {
    if (isTensorArray(inputs)) {
      return inputs[0];
    }
    return inputs;
  };
  class MultiplyBeta extends Layer {
    beta: number;

    constructor() {
      super({});
      this.beta = BETA;
    }

    call(inputs: Inputs) {
      return tf.mul(getInput(inputs), this.beta);
    }

    static className = 'MultiplyBeta';
  }

  class PixelShuffle extends Layer {
    scale: number;

    constructor() {
      super({});
      this.scale = SCALE;
    }

    computeOutputShape(inputShape: number[]) {
      return [inputShape[0], inputShape[1], inputShape[2], 3,];
    }

    call(inputs: Inputs) {
      return tf.depthToSpace(getInput(inputs), this.scale, 'NHWC');
    }

    static className = 'PixelShuffle';
  }

  const modelDefinition: ModelDefinition = {
    scale: SCALE,
    channels: 3,
    path: 'models/model.json',
    packageInformation: {
      name: NAME,
      version: VERSION,
    },
    meta: {
      dataset: 'div2k',
    },
    preprocess: (image: tfc.Tensor) => tf.mul(image, 1 / 255),
    postprocess: (output: tfc.Tensor) => tf.tidy(() => {
      const clippedValue = (output).clipByValue(0, 1);
      output.dispose();
      return tf.mul(clippedValue, 255);
    }),
    customLayers: [MultiplyBeta, PixelShuffle,],
  };

  return modelDefinition;
};

export default modelDefinition;
