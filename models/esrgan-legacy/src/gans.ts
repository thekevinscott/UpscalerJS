import type { Tensor, Tensor4D, } from '@tensorflow/tfjs-core';
import type { ModelDefinition, ModelDefinitionFn, TF, } from '@upscalerjs/core';
import { NAME, VERSION, } from './constants.generated';

const modelDefinition: ModelDefinitionFn = (tf: TF) => {
  const Layer = tf.layers.Layer;
  const SCALE = 4;
  const BETA = 0.2;

  type Inputs = Tensor4D | Tensor4D[];

  const isTensorArray = (inputs: Inputs): inputs is Tensor4D[] => {
    return Array.isArray(inputs);
  };

  const getInput = (inputs: Inputs): Tensor4D => {
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
    path: 'models/gans/model.json',
    packageInformation: {
      name: NAME,
      version: VERSION,
    },
    meta: {
      dataset: 'div2k',
    },
    preprocess: (image: Tensor) => tf.mul(image, 1 / 255),
    postprocess: (output: Tensor) => tf.tidy(() => {
      const clippedValue = (output).clipByValue(0, 1);
      output.dispose();
      return tf.mul(clippedValue, 255);
    }),
    customLayers: [MultiplyBeta, PixelShuffle,],
  };

  return modelDefinition;
};

export default modelDefinition;
