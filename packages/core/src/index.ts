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
export type Range = [number, number,];

type MetaValue = string | number | Meta | null | undefined | boolean;
export type Meta = { [key: string]: MetaValue };
export type ModelType = 'graph' | 'layers';

export type PreProcess = ProcessFn<Tensor4D>;
export type PostProcess = ProcessFn<Tensor4D>;

export interface CustomOp {
  name: string;
  op: OpExecutor;
}

export type Shape4D = [null | number, number, number, number];
export const isShape4D = (shape?: unknown): shape is Shape4D => {
  if (!Boolean(shape) || !Array.isArray(shape) || shape.length !== 4) {
    console.log('naw!')
    return false;
  }
  for (const val of shape) {
    if (val !== null && typeof val !== 'number') {
      console.log(val, 'naw')
      return false;
    }
  }
  return true;
};

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
    * Two numbers denoting the range in which the model expects number to be in the range of. Defaults to [0, 255].
    */
  inputRange?: Range;
  /**
   * Two numbers denoting the range in which the model is expected to output its predictions. Numbers can still fall outside of this range, but 
   * UpscalerJS will use the range to clip the values appropriately. Defaults to [0, 255].
   */
  outputRange?: Range;
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
export const isTensor = (input: unknown): input is tf.Tensor => input instanceof tf.Tensor;
export const isString = (el: unknown): el is string => typeof el === 'string';

export const isValidModelType = (modelType: unknown): modelType is ModelType => typeof modelType === 'string' && ['layers', 'graph',].includes(modelType);

export const isValidModelDefinition = (modelDefinition?: ModelDefinition): modelDefinition is ModelDefinition => {
  if (modelDefinition === undefined) {
    return false;
  }
  if (!isValidModelType(modelDefinition.modelType || 'layers')) {
    return false;
  }
  return Boolean(modelDefinition.path && modelDefinition.scale);
};

export const hasValidChannels = (tensor: tf.Tensor): boolean => tensor.shape.slice(-1)[0] === 3;

export const isNumber = (el: unknown): el is number => typeof el === 'number';
export const isValidRange = (range: unknown): range is Range => Array.isArray(range) && range.length === 2 && range.every(isNumber);
