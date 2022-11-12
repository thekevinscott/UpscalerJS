import type { Tensor4D, } from '@tensorflow/tfjs-core';

export type Scale = 2 | 3 | 4 | 8;

export type Inputs = Tensor4D | Tensor4D[];
