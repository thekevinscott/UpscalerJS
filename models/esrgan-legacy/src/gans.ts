import type { Tensor4D, } from '@tensorflow/tfjs-core';
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

  [MultiplyBeta, PixelShuffle,].forEach((layer) => {
    tf.serialization.registerClass(layer);
  });

  const modelDefinition: ModelDefinition = {
    scale: SCALE,
    path: 'models/gans/model.json',
    packageInformation: {
      name: NAME,
      version: VERSION,
    },
    meta: {
      dataset: 'div2k',
    },
    inputRange: [0, 1,],
    outputRange: [0, 1,],
  };

  return modelDefinition;
};

export default modelDefinition;
