import * as tf from '@tensorflow/tfjs-core';
import type * as tfBrowser from '@tensorflow/tfjs';
import type * as tfNode from '@tensorflow/tfjs-node';
import type * as tfNodeGpu from '@tensorflow/tfjs-node-gpu';
import { Tensor, Tensor3D, Tensor4D, } from '@tensorflow/tfjs-core';

export type TF = typeof tfBrowser | typeof tfNode | typeof tfNodeGpu;
/* eslint-disable @typescript-eslint/no-duplicate-type-constituents */
export type OpExecutor = tfBrowser.OpExecutor | tfNode.OpExecutor | tfNodeGpu.OpExecutor;

export type ProcessFn<T extends Tensor> = (t: T) => T;
export interface ModelConfigurationInternals {
  name: string;
  version: string;
  path: string;
}

export type Range = [number, number,];

type MetaValue = string | number | Meta | null | undefined | boolean;
export type Meta = { [key: string]: MetaValue };
export type ModelType = 'graph' | 'layers';

export type PreProcess = ProcessFn<Tensor4D>;
export type PostProcess = ProcessFn<Tensor4D>;

// A model's input shape where height and width are fixed numbers
export type FixedShape4D = [null | number, number, number, number];
// A model's input shape where height and width can be anything
export type DynamicShape4D = [null | number, null, null, number];
export type Shape4D = FixedShape4D | DynamicShape4D;
export const isShape4D = (shape?: unknown): shape is Shape4D => {
  if (!Boolean(shape) || !Array.isArray(shape) || shape.length !== 4) {
    return false;
  }
  return shape.every((value) => value === null || typeof value === 'number');
};

export const isFixedShape4D = (shape?: unknown): shape is FixedShape4D => isShape4D(shape) && shape[1] !== null && shape[2] !== null && shape[1] > 0 && shape[2] > 0;
export const isDynamicShape4D = (shape?: unknown): shape is DynamicShape4D => isShape4D(shape) && !isFixedShape4D(shape);

export type Setup = (tf: TF) => (void | Promise<void>);
export type Teardown = (tf: TF) => (void | Promise<void>);

export interface ModelDefinition {
  /**
   * The type of the model. Can be 'graph' or 'layer'.
   */
  modelType: ModelType;
  /**
   * Path to a model.json file.
   */
  path?: string;
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
   * Used internally by UpscalerJS models to encode information about the model configuration, such as package version, package name, and path to model JSON file.
   */
  _internals?: ModelConfigurationInternals;
  /**
   * A function that processes the input image before feeding to the model. For example, you can use this function if you need to regularize your input.
   */
  preprocess?: PreProcess;
  /**
   * A function that processes the input image after being run through model inference. For example, you may need to convert floats to 0-255 integers.
   */
  postprocess?: PostProcess;
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
   * A number denoting whether and how an image should be divisible. For instance, a model may only operate on images that are even (divisible by 2), in
   * which case this would be `2`. Only square sizes are supported for now.
   */
  divisibilityFactor?: number;
  /**
   * @hidden
   */
  meta?: Meta;
  /**
   * A function that runs when a model is instantiated. Can be used for registering custom layers and ops. 
   */
  setup?: Setup;
  /**
   * A function that runs when a model is disposed. Can be used for releasing memory.
   */
  teardown?: Teardown;
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

export enum MODEL_DEFINITION_VALIDATION_CHECK_ERROR_TYPE {
  UNDEFINED = 'undefined',
  INVALID_MODEL_TYPE = 'invalidModelType',
  MISSING_PATH = 'missingPath',
}

export class ModelDefinitionValidationError extends Error {
  type: MODEL_DEFINITION_VALIDATION_CHECK_ERROR_TYPE;

  constructor(type: MODEL_DEFINITION_VALIDATION_CHECK_ERROR_TYPE) {
    super(type);
    this.type = type;
  }
}

export const isValidModelDefinition = (modelDefinition?: ModelDefinition): modelDefinition is ModelDefinition => {
  if (modelDefinition === undefined) {
    throw new ModelDefinitionValidationError(MODEL_DEFINITION_VALIDATION_CHECK_ERROR_TYPE.UNDEFINED);
  }
  if (!isValidModelType(modelDefinition.modelType ?? 'layers')) {
    throw new ModelDefinitionValidationError(MODEL_DEFINITION_VALIDATION_CHECK_ERROR_TYPE.INVALID_MODEL_TYPE);
  }
  if (!modelDefinition.path && !modelDefinition._internals?.path) {
    throw new ModelDefinitionValidationError(MODEL_DEFINITION_VALIDATION_CHECK_ERROR_TYPE.MISSING_PATH);
  }
  return true;
};

export const hasValidChannels = (tensor: tf.Tensor): boolean => tensor.shape.slice(-1)[0] === 3;

export const isNumber = (el: unknown): el is number => typeof el === 'number';
export const isValidRange = (range: unknown): range is Range => Array.isArray(range) && range.length === 2 && range.every(isNumber);
