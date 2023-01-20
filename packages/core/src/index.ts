import * as tf from '@tensorflow/tfjs-core';
import type * as tfBrowser from '@tensorflow/tfjs';
import type * as tfNode from '@tensorflow/tfjs-node';
import type * as tfNodeGpu from '@tensorflow/tfjs-node-gpu';
import type { Tensor, Tensor3D, Tensor4D, serialization, } from '@tensorflow/tfjs-core';

export type TF = typeof tfBrowser | typeof tfNode | typeof tfNodeGpu;
export type OpExecutor = tfBrowser.OpExecutor | tfNode.OpExecutor | tfNodeGpu.OpExecutor;

export type ProcessFn<T extends Tensor> = (t: T) => T;
export interface PackageInformation {
  name: string;
  version: string;
}

type CustomLayer = Parameters<typeof serialization.registerClass>[0];

type MetaValue = string | number | Meta | null | undefined | boolean;
export type Meta = { [key: string]: MetaValue };
export type ModelType = 'graph' | 'layers';

export type PreProcess = ProcessFn<Tensor4D>;
export type PostProcess = ProcessFn<Tensor4D>;

export interface CustomOp {
  name: string;
  op: OpExecutor;
}

export interface ModelDefinition {
  /**
   * Path to a model.json file.
   */
  path: string;
  /**
   * The scale of the model. For super resolution models, should match the scale at which the model was trained.
   */
  scale: number;
  /**
   * @hidden
   * 
   * Future option for specifying the number of channels; will enable grayscale and alpha transparency models. Current models only support 3 channels.
   */
  channels?: 3;
  /**
   * @hidden
   * 
   * Used internally by UpscalerJS models to encode information about package version and name.
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
   * Custom layers for the model. You can learn more about custom layers [here](https://www.tensorflow.org/js/guide/models_and_layers#custom_layers).
   */
  customLayers?: CustomLayer[];
  /**
   * Custom ops for the model. You can learn more about custom ops [here](https://www.tensorflow.org/js/guide/custom_ops_kernels_gradients).
   */
  customOps?: CustomOp[];
  /**
   * @hidden
   */
  meta?: Meta;
}

export type ModelDefinitionFn = (tf: TF) => ModelDefinition;

export type ModelDefinitionObjectOrFn = ModelDefinitionFn | ModelDefinition;

export type IsTensor<T extends tfBrowser.Tensor> = (pixels: Tensor) => pixels is T;
export function makeIsNDimensionalTensor<T extends Tensor>(rank: number): IsTensor<T> {
  function fn(pixels: Tensor): pixels is T {
    try {
      return pixels.shape.length === rank;
    } catch (err) { }
    return false;
  }

  return fn;
}
export const isFourDimensionalTensor = makeIsNDimensionalTensor<Tensor4D>(4);
export const isThreeDimensionalTensor = makeIsNDimensionalTensor<Tensor3D>(3);
export const isTensor = (input: unknown): input is tf.Tensor => input instanceof tf.Tensor;
export const isString = (el: unknown): el is string => typeof el === 'string';

export const isValidModelDefinition = (modelDefinition?: ModelDefinition): modelDefinition is ModelDefinition => {
  if (modelDefinition === undefined) {
    return false;
  }
  return Boolean(modelDefinition.path && modelDefinition.scale);
};

export const hasValidChannels = (tensor: tf.Tensor): boolean => tensor.shape.slice(-1)[0] === 3;
