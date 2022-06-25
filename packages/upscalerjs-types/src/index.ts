import * as tf from '@tensorflow/tfjs';

export type ProcessFn<T extends tf.Tensor> = (t: T) => T;
export interface PackageInformation {
  name: string;
  version: string;
}

type CustomLayer = Parameters<typeof tf.serialization.registerClass>[0];
export interface ModelDefinition {
  path: string;
  scale: 2 | 3 | 4;
  channels?: 3;
  packageInformation?: PackageInformation;
  preprocess?: ProcessFn<tf.Tensor4D>;
  postprocess?: ProcessFn<tf.Tensor3D>;
  // customLayers?: SerializableConstructor<tf.layers.Layer>[];
  customLayers?: CustomLayer[];

  /* eslint-disable @typescript-eslint/no-explicit-any */
  meta?: Record<string, any>;
}

