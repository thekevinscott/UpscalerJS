import { Tensor, Tensor4D, Tensor3D, serialization } from '@tensorflow/tfjs-core';

export type ProcessFn<T extends Tensor> = (t: T) => T;
export interface PackageInformation {
  name: string;
  version: string;
}

type CustomLayer = Parameters<typeof serialization.registerClass>[0];
export interface ModelDefinition {
  path: string;
  scale: 2 | 3 | 4;
  channels?: 3;
  packageInformation?: PackageInformation;
  preprocess?: ProcessFn<Tensor4D>;
  postprocess?: ProcessFn<Tensor3D>;
  customLayers?: CustomLayer[];

  /* eslint-disable @typescript-eslint/no-explicit-any */
  meta?: Record<string, any>;
}

