import type * as tf from '@tensorflow/tfjs';
import type * as tfNode from '@tensorflow/tfjs-node';
import type * as tfNodeGpu from '@tensorflow/tfjs-node-gpu';
import { Tensor, Tensor4D, Tensor3D, serialization } from '@tensorflow/tfjs-core';

type TF = typeof tf | typeof tfNode | typeof tfNodeGpu;

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

  meta?: Record<string, any>;
}

export type ModelDefinitionFn = (tf: TF) => ModelDefinition;

export type ModelDefinitionObjectOrFn = ModelDefinitionFn | ModelDefinition;

export function isModelDefinitionFn (modelDefinition: ModelDefinitionObjectOrFn): modelDefinition is ModelDefinitionFn { return typeof modelDefinition === 'function' };
