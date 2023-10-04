import type { Tensor3D, Tensor4D, } from '@tensorflow/tfjs-core';
import type { FromPixelsInputs, } from '@tensorflow/tfjs';

export type Input = Tensor3D | Tensor4D | string | FromPixelsInputs['pixels'];
