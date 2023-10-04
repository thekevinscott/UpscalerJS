import type { Tensor3D, Tensor4D, } from '@tensorflow/tfjs-core';

export type Input = Tensor3D | Tensor4D | string | Uint8Array | Buffer;
