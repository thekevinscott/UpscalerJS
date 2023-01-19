import type { ModelDefinition, ModelDefinitionFn, } from '@upscalerjs/core';
import { NAME, VERSION, } from '../constants.generated';
import { Inputs, Scale, } from '../types';
import { getInput, } from './getInput';


// skipcq: js-0108
const getModelDefinition = (scale: Scale, modelFileName: string): ModelDefinitionFn => (tf): ModelDefinition => {
  const Layer = tf.layers.Layer;
  const BETA = 0.2;

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

  const getPixelShuffle = (_scale: number) => {
    class PixelShuffle extends Layer {
      scale: number = _scale;

      constructor() {
        super({});
      }

      // skipcq: js-0105
      computeOutputShape(inputShape: number[]) {
        return [inputShape[0], inputShape[1], inputShape[2], 3,];
      }

      call(inputs: Inputs) {
        return tf.depthToSpace(getInput(inputs), this.scale, 'NHWC');
      }

      static className = `PixelShuffle${scale}x`;
    }

    return PixelShuffle;
  };

  return {
    inputRange: [0, 1,],
    outputRange: [0, 1,],
    customLayers: [MultiplyBeta, getPixelShuffle(scale),],
    scale,
    path: `models/${scale}x/model.json`,
    packageInformation: {
      name: NAME,
      version: VERSION,
    },
    meta: {
      C: 4,
      D: 3,
      G: 32,
      G0: 64,
      T: 10,
      architecture: "rrdn",
      patchSize: scale === 3 ? 129 : 128,
      size: 'slim',
      artifactReducing: false,
      sharpening: false,
      dataset: 'div2k',
      modelFileName,
    },
  };
};

export default getModelDefinition;
