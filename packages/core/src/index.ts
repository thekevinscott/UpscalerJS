import type * as tf from '@tensorflow/tfjs';
import type * as tfNode from '@tensorflow/tfjs-node';
import type * as tfNodeGpu from '@tensorflow/tfjs-node-gpu';
import type { Tensor, Tensor3D, Tensor4D, serialization, } from '@tensorflow/tfjs-core';

export type TF = typeof tf | typeof tfNode | typeof tfNodeGpu;

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

export interface ModelDefinition {
  /**
   * Path to a model.json file.
   */
  path: string;
  /**
   * The type of the model. Can be 'graph' or 'layer'. Defaults to 'layer'
   */
  modelType?: ModelType;
  /**
   * The scale of the model. For super resolution models, should match the scale at which the model was trained.
   */
  scale?: number;
  /**
   * The expected input size of the model. Should be a single number representing a square size.
   */
  inputSize?: number;
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
  customOps?: ({
    name: string;
    op: tf.OpExecutor;
  })[];
  /**
   * Two numbers denoting the range in which the model is expected to output its predictions. Numbers may still fall outside of this range, but 
   * UpscalerJS will use the range to multiply and clip the values appropriately. Defaults to [0, 255].
   */
  outputRange?: [number, number];

  /**
   * Two numbers denoting the range in which the model expects number to be in the range of. Defaults to [0, 255].
   */
  inputRange?: [number, number];

  /**
   * @hidden
   */
  meta?: Meta;
}

export type ModelDefinitionFn = (tf: TF) => ModelDefinition;

export type ModelDefinitionObjectOrFn = ModelDefinitionFn | ModelDefinition;

export type IsTensor<T extends tf.Tensor> = (pixels: Tensor) => pixels is T;
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
