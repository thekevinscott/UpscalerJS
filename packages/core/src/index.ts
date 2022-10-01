import type * as tf from '@tensorflow/tfjs';
import type * as tfNode from '@tensorflow/tfjs-node';
import type * as tfNodeGpu from '@tensorflow/tfjs-node-gpu';
import type { Tensor, Tensor4D, serialization, } from '@tensorflow/tfjs-core';

export type TF = typeof tf | typeof tfNode | typeof tfNodeGpu;

export type ProcessFn<T extends Tensor> = (t: T) => T;
export interface PackageInformation {
  name: string;
  version: string;
}

type CustomLayer = Parameters<typeof serialization.registerClass>[0];

type Meta = { [key: string]: string | number | Meta | null | undefined };

export type PreProcess = ProcessFn<Tensor4D>;
export type PostProcess = ProcessFn<Tensor4D>;

export interface ModelDefinition {
  path: string;
  scale: number;
  channels?: 3;
  packageInformation?: PackageInformation;
  preprocess?: PreProcess;
  postprocess?: PostProcess;
  customLayers?: CustomLayer[];

  meta?: Meta;
}

export type ModelDefinitionFn = (tf: TF) => ModelDefinition;

export type ModelDefinitionObjectOrFn = ModelDefinitionFn | ModelDefinition;
