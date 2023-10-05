import type { Meta, ModelDefinition, Setup } from '../types';
import type { Tensor4D, } from '@tensorflow/tfjs-core';

export type Inputs = Tensor4D | Tensor4D[];

export type Scale = 2 | 3 | 4 | 8;

const isTensorArray = (inputs: Inputs): inputs is Tensor4D[] => {
  return Array.isArray(inputs);
};

const getInput = (inputs: Inputs): Tensor4D => {
  if (isTensorArray(inputs)) {
    return inputs[0];
  }
  return inputs;
};


export const getESRGANModelDefinition = ({
  scale,
  name,
  version,
  meta: {
    architecture,
    ...meta
  },
  path: modelPath,
}: {
  name: string;
  version: string;
  scale: Scale;
  meta: Meta;
  path?: string;
}): ModelDefinition => {
  const path = modelPath || `models/${scale}x/model.json`;
  if (architecture === 'rdn') {
    return {
      scale,
      modelType: 'layers',
      _internals: {
        path,
        name,
        version,
      },
      meta: {
        architecture,
        ...meta,
      },
      inputRange: [0, 255,],
      outputRange: [0, 255,],
    };
  }

  const setup: Setup = (tf) => {
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

    [
      MultiplyBeta,
      getPixelShuffle(scale),
    ].forEach((layer) => {
      tf.serialization.registerClass(layer);
    });
  };

  return {
    setup,
    scale,
    modelType: 'layers',
    _internals: {
      path,
      name,
      version,
    },
    meta: {
      architecture,
      ...meta,
    },
    inputRange: [0, 1,],
    outputRange: [0, 1,],
  };
};
