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

type MetaValue = string | number | Meta | null | undefined | boolean;
export type Meta = { [key: string]: MetaValue };

export type PreProcess = ProcessFn<Tensor4D>;
export type PostProcess = ProcessFn<Tensor4D>;

export interface ModelDefinition {
  /**
   * Path to a model.json file.
   */
  path: string;
  /**
   * The scale of the model. Must match the scale at which the model was trained.
   */
  scale: number;
  /**
   * @hidden
   */
  channels?: 3;
  /**
   * @hidden
   */
  packageInformation?: PackageInformation;
  /**
   * A function that processes the input image before feeding to the model. For example, you can use this function if you need to regularize your input.
   */
  preprocess?: PreProcess;
  /**
   * A function that processes the input image after being run through model inference. For example, you may need to convert floats to 0-255 integers.
   */
  postprocess?: PostProcess;
  /**
   * Custom layers for the model.
   */
  customLayers?: CustomLayer[];

  /**
   * @hidden
   */
  meta?: Meta;
}

export type ModelDefinitionFn = (tf: TF) => ModelDefinition;

export type ModelDefinitionObjectOrFn = ModelDefinitionFn | ModelDefinition;
