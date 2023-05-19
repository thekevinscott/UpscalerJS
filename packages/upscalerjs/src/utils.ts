import { tf, } from './dependencies.generated';
import type { ParsedModelDefinition, Progress, SingleArgProgress, ResultFormat, MultiArgTensorProgress, UpscaleArgs, ModelPackage, } from './types';
import { 
  ModelDefinitionFn, 
  ModelDefinition, 
  ModelDefinitionObjectOrFn, 
  isShape4D, 
  Shape4D, 
  ProcessFn, 
  ModelType, 
} from '@upscalerjs/core';
import { isLayersModel, } from './isLayersModel';
import {
  ERROR_WITH_MODEL_INPUT_SHAPE,
  GET_INVALID_PATCH_SIZE,
  MODEL_INPUT_SIZE_MUST_BE_SQUARE,
  WARNING_INPUT_SIZE_AND_PATCH_SIZE,
  WARNING_UNDEFINED_PADDING,
} from './errors-and-warnings';
import {
  isInputSizeDefined,
} from './tensor-utils';

export const warn = (msg: string | string[]): void => {
  console.warn(Array.isArray(msg) ? msg.join('\n') : msg);// skipcq: JS-0002
};

export function isProgress(p: undefined | Progress): p is Progress { return p !== undefined && typeof p === 'function'; }
export function isSingleArgProgress(p: Progress): p is SingleArgProgress { return isProgress(p) && p.length <= 1; }
export const isMultiArgTensorProgress = (p: Progress, output: ResultFormat, progressOutput: ResultFormat): p is MultiArgTensorProgress => {
  if (!isProgress(p) || p.length <= 1) {
    return false;
  }
  return progressOutput === undefined && output === 'tensor' || progressOutput === 'tensor';
};

export const isAborted = (abortSignal?: AbortSignal): boolean => {
  if (abortSignal) {
    return abortSignal.aborted;
  }
  return false;
};

type PostNext<T = unknown> = ((value: T) => (void | Promise<void>));
/* eslint-disable @typescript-eslint/no-explicit-any */
export async function wrapGenerator<T = unknown, TReturn = any, TNext = unknown>(
  gen: Generator<T, TReturn, TNext> | AsyncGenerator<T, TReturn, TNext>, 
  postNext?: PostNext<T>
): Promise<TReturn> {
  let result: undefined | IteratorResult<T, TReturn>;
  for (result = await gen.next(); !result.done; result = await gen.next()) {
    if (postNext) {
      await postNext(result.value);
    }
  }
  return result.value;
}

export function isModelDefinitionFn(modelDefinition: ModelDefinitionObjectOrFn): modelDefinition is ModelDefinitionFn { return typeof modelDefinition === 'function'; }

export function getModel(modelDefinition: ModelDefinitionObjectOrFn): ModelDefinition {
  /* eslint-disable @typescript-eslint/no-unsafe-call */
  /* eslint-disable @typescript-eslint/no-unsafe-return */
  return isModelDefinitionFn(modelDefinition) ? modelDefinition(tf) : modelDefinition;
}

export function nonNullable<T>(value: T): value is NonNullable<T> {
  return value !== null && value !== undefined;
}

// this function disposes of any input tensors
export function processAndDisposeOfTensor<T extends tf.Tensor>(
  tensor: T,
  ..._processFns: (ProcessFn<T> | undefined)[]
): T {
  const processFns: ProcessFn<T>[] = _processFns.filter(nonNullable);

  if (processFns.length) {
    const processedTensor = tf.tidy(() => processFns.reduce((reducedTensor, processFn) => processFn(reducedTensor), tensor));
    if (!tensor.isDisposed && tensor !== processedTensor) {
      tensor.dispose();
    }
    return processedTensor;
  }
  return tensor;
}

export function loadTfModel<M extends ModelType, R = Promise<M extends 'graph' ? tf.GraphModel : tf.LayersModel>>(modelPath: string, modelType?: M): R {
  if (modelType === 'graph') {
    return tf.loadGraphModel(modelPath) as R;
  }
  return tf.loadLayersModel(modelPath) as R;
}

const getBatchInputShape = (model: tf.LayersModel | tf.GraphModel): unknown => {
  if (isLayersModel(model)) {
    return model.layers[0].batchInputShape;
  }
  return model.inputs[0].shape;
};

export const getModelInputShape = ({ model, }: ModelPackage): Shape4D => {
  const batchInputShape = getBatchInputShape(model);
  if (!isShape4D(batchInputShape)) {
    throw new Error(ERROR_WITH_MODEL_INPUT_SHAPE(batchInputShape));
  }

  return batchInputShape;
};

type ParsePatchAndInputSizes = ( modelPackage: ModelPackage, args: UpscaleArgs) => Pick<UpscaleArgs, 'patchSize' | 'padding'>;
export const parsePatchAndInputSizes: ParsePatchAndInputSizes = (modelPackage, { patchSize, padding, }) => {
  const inputShape = getModelInputShape(modelPackage);
  if (patchSize !== undefined && patchSize <= 0) {
    throw GET_INVALID_PATCH_SIZE(patchSize);
  }
  if (isInputSizeDefined(inputShape)) {
    if (patchSize !== undefined) {
      warn(WARNING_INPUT_SIZE_AND_PATCH_SIZE);
    }

    if (inputShape[1] !== inputShape[2]) {
      throw MODEL_INPUT_SIZE_MUST_BE_SQUARE;
    }
    return {
      patchSize: inputShape[1] - (padding || 0) * 2,
      padding,
    };
  }

  if (patchSize !== undefined && padding === undefined) {
    // warn the user about possible tiling effects if patch size is provided without padding
    warn(WARNING_UNDEFINED_PADDING);
  }


  return {
    patchSize,
    padding,
  };
};

export const parseModelDefinition: ParseModelDefinition = (modelDefinition) => ({
  ...modelDefinition,
});

export type ParseModelDefinition = (m: ModelDefinition) => ParsedModelDefinition;
