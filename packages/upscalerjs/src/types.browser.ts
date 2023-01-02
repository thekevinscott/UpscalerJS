import { tf, } from './dependencies.generated';

export type Input = tf.Tensor3D | tf.Tensor4D | string | tf.FromPixelsInputs['pixels'];
