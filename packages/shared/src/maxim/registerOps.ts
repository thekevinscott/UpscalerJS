import { Tensor, Tensor4D, } from '@tensorflow/tfjs-core';
import type { OpExecutor, TF, } from '../../../core/src/index';

const getSize = (size_tensor: Tensor): [number, number] => {
  const size = Array.from((size_tensor).dataSync());
  if (size_tensor.shape[0] < 2) {
    console.error(size_tensor.dataSync(), size_tensor.shape);
    throw new Error('Invalid size tensor');
  }

  const [height, width,] = Array.from(size_tensor.dataSync());

  if (!height || !width) {
    console.error(size);
    throw new Error('Missing size elements');
  }

  return [
    height,
    width,
  ];
};

export function registerOps(tf: TF) {
  const ScaleAndTranslate: OpExecutor = ({ inputs, }) => {
    if (inputs.length <= 2) {
      throw new Error('Expected four tensors to scale and translate op');
    }
    const [input, size_tensor,] = inputs;
    return tf.tidy(() => {
      const size = getSize(size_tensor);
      return tf.image.resizeNearestNeighbor(
        input as Tensor4D,
        size,
      );
    });
  };

  // const ScaleAndTranslateBadImplementation = ({ inputs: [input, size,], }) => tf.tidy(() => {
  //   if (!isFourDimensionalTensor(input)) {
  //     throw new Error(`Invalid rank of tensor, should be 4: ${input.rank}`);
  //   }
  //   const [height, width,] = Array.from(size.dataSync());
  //   const boxes: Tensor2D = tf.concat([
  //     tf.zeros([2,]),
  //     size,
  //   ], 0).expandDims(0);
  //   return tf.image.cropAndResize(
  //     input,
  //     boxes,
  //     [0,],
  //     [height, width,],
  //     'bilinear',
  //   );
  // });

  tf.registerOp('ScaleAndTranslate', ScaleAndTranslate);
}
