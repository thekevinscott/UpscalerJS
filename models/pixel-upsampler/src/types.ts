// import { tf, } from './dependencies.generated';
// import { SerializableConstructor, } from '@tensorflow/tfjs-core/dist/serialization';
// export type { ModelDefinition } from 'upscaler';
// export interface ModelDefinition {
//   scale: 2 | 3 | 4 | 8;
//   channels: 3;
//   dataset?: string;
//   name?: string; // proxy for "size" (e.g., small, medium, large)
//   internalWeightsPath: string;
// }

// export type ProcessFn<T extends tf.Tensor> = (t: T) => T;
// export interface ModelDefinition {
//   path: string;
//   scale: 2 | 3 | 4;
//   channels?: 3;
//   preprocess?: ProcessFn<tf.Tensor4D>;
//   postprocess?: ProcessFn<tf.Tensor3D>;
//   customLayers?: SerializableConstructor<tf.layers.Layer>[];
//   meta?: Record<string, any>;
//   package: {
//     name: string;
//     version: string;
//   }
// }
