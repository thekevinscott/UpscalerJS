import { tfcore, tflayers } from './dependencies.generated';
import { ModelDefinition } from '@upscalerjs/core';
import { NAME, VERSION } from './constants.generated';

const SCALE = 4;
const BETA = 0.2;

type Inputs = tfcore.Tensor4D | tfcore.Tensor4D[];

const isTensorArray = (inputs: Inputs): inputs is tfcore.Tensor4D[] => {
  return Array.isArray(inputs);
};

const getInput = (inputs: Inputs): tfcore.Tensor4D => {
  if (isTensorArray(inputs)) {
    return inputs[0];
  }
  return inputs;
};
class MultiplyBeta extends tflayers.layers.Layer {
  beta: number;

  constructor() {
    super({});
    this.beta = BETA;
  }

  call(inputs: Inputs) {
    return tfcore.mul(getInput(inputs), this.beta);
  }

  static className = 'MultiplyBeta';
}

class PixelShuffle extends tflayers.layers.Layer {
  scale: number;

  constructor() {
    super({});
    this.scale = SCALE;
  }

  computeOutputShape(inputShape: number[]) {
    return [inputShape[0], inputShape[1], inputShape[2], 3,];
  }

  call(inputs: Inputs) {
    return tfcore.depthToSpace(getInput(inputs), this.scale, 'NHWC');
  }

  static className = 'PixelShuffle';
}

// TODO: For some reason, the tfjs-core package differs from an imported tfjs package,
// in that tensor definitions do not have the clipByValue function. Therefore, we
// manually set it.
type ClipByValue = <T extends tfcore.Tensor>(min: number, max: number) => T;
type TensorWithClipByValue = tfcore.Tensor & {
  clipByValue: ClipByValue;
}
const modelDefinition: ModelDefinition = {
  scale: 4,
  channels: 3,
  path: 'models/model.json',
  packageInformation: {
    name: NAME,
    version: VERSION,
  },
  meta: {
    dataset: 'div2k',
  },
  preprocess: (image: tfcore.Tensor) => tfcore.mul(image, 1 / 255),
  postprocess: (output: tfcore.Tensor) => tfcore.tidy(() => {
    const clippedValue = (output as TensorWithClipByValue).clipByValue(0, 1);
    output.dispose();
    return tfcore.mul(clippedValue, 255);
  }),
  customLayers: [MultiplyBeta, PixelShuffle,],
};

export default modelDefinition;
