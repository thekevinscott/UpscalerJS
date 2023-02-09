import type { Tensor4D, } from '@tensorflow/tfjs-core';
import type { ModelDefinitionFn, TF, } from '@upscalerjs/core';
import { getESRGANModelDefinition, } from '../../../packages/shared/src/esrgan';
import { NAME, VERSION, } from './constants.generated';

const modelDefinition: ModelDefinitionFn = (tf: TF) => {
  /** For some reason, the below custom registered layers
   * are required even though we're redefining them in the shared esrgan
   * package. I'm not sure why this is the case, but it's a workaround.
   */
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

  return getESRGANModelDefinition({
    scale: SCALE, 
    path: `models/gans/model.json`,
    name: NAME,
    version: VERSION,
    meta: {
      dataset: 'div2k',
      architecture: "rrdn",
    },
  })(tf);
};

export default modelDefinition;
