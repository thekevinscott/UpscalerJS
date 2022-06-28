import { tf, } from './dependencies.generated';
import { ModelDefinition } from '@upscalerjs/core';
import { NAME, VERSION } from './constants.generated';

const SCALE = 4;
const BETA = 0.2;

type Inputs = tf.Tensor4D | tf.Tensor4D[];

const isTensorArray = (inputs: Inputs): inputs is tf.Tensor4D[] => {
  return Array.isArray(inputs);
};

const getInput = (inputs: Inputs): tf.Tensor4D => {
  if (isTensorArray(inputs)) {
    return inputs[0];
  }
  return inputs;
};

class MultiplyBeta extends tf.layers.Layer {
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

class PixelShuffle extends tf.layers.Layer {
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
  scale: 2,
  channels: 3,
  path: 'models/idealo/gans/model.json',
  packageInformation: {
    name: NAME,
    version: VERSION,
  },
  meta: {
    dataset: 'div2k',
  },
  preprocess: (image: tf.Tensor) => tf.mul(image, 1 / 255),
  postprocess: (output: tf.Tensor) => tf.tidy(() => {
    const clippedValue = output.clipByValue(0, 1);
    output.dispose();
    return tf.mul(clippedValue, 255);
  }),
  customLayers: [MultiplyBeta, PixelShuffle,],
};

export default modelDefinition;
