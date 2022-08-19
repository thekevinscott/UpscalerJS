import * as tf from '@tensorflow/tfjs';

export const spliceTensor = (base: tf.Tensor3D, slice: tf.Tensor3D, x: number, y: number): tf.Tensor3D => tf.tidy(() => {
  const left = base.slice([0, y], [0, x]);
  // console.log(y, x, slice.shape[0], slice.shape[1])
  // console.log(base.shape)
  const col = base.slice([y, x], [slice.shape[0], slice.shape[1]]);
  // const rightSide = base.slice([y + slice.shape[0]], [x + slice.shape[1]]);
  console.log('left', left.shape)
  console.log('col', col.shape)
  const r = tf.concat([left, col]);
  console.log('r', r.shape)
  return r;
});
