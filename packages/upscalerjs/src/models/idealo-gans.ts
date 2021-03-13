import * as tf from '@tensorflow/tfjs';
import { IIntermediaryModelDefinition } from '../types';

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
    return [inputShape[0], inputShape[1], inputShape[2], 3];
  }

  call(inputs: Inputs) {
    return tf.depthToSpace(getInput(inputs), this.scale, 'NHWC');
  }

  static className = 'PixelShuffle';
}

const config: IIntermediaryModelDefinition = {
  urlPath: 'idealo/gans',
  scale: 4,
  preprocess: (image) => tf.div(image, 255),
  postprocess: (output: tf.Tensor3D) => tf.mul(output.clipByValue(0, 1), 255),
  customLayers: [MultiplyBeta, PixelShuffle],
};

export default config;
