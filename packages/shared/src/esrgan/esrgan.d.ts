import type { Meta, ModelDefinition } from '../types';
import type { Tensor4D } from '@tensorflow/tfjs-core';
export type Inputs = Tensor4D | Tensor4D[];
export type Scale = 2 | 3 | 4 | 8;
export declare const getESRGANModelDefinition: ({ scale, name, version, meta: { architecture, ...meta }, path: modelPath, }: {
    name: string;
    version: string;
    scale: Scale;
    meta: Meta;
    path?: string | undefined;
}) => ModelDefinition;
//# sourceMappingURL=esrgan.d.ts.map