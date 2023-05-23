import { tf, } from './dependencies.generated';

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

import {
  ModelDefinition,
  ModelDefinitionFn,
  ModelDefinitionObjectOrFn,
  isShape4D, 
  Shape4D, 
  ModelType, 
} from '@upscalerjs/core';
import type {
  ModelPackage,
  ParsedModelDefinition,
  UpscaleArgs,
} from './types';
import {
  warn,
} from './utils';

export const parseModelDefinition: ParseModelDefinition = (modelDefinition) => ({
  ...modelDefinition,
});

export type ParseModelDefinition = (m: ModelDefinition) => ParsedModelDefinition;

export function isModelDefinitionFn(modelDefinition: ModelDefinitionObjectOrFn): modelDefinition is ModelDefinitionFn { return typeof modelDefinition === 'function'; }

export function getModel(modelDefinition: ModelDefinitionObjectOrFn): ModelDefinition {
  /* eslint-disable @typescript-eslint/no-unsafe-call */
  /* eslint-disable @typescript-eslint/no-unsafe-return */
  return isModelDefinitionFn(modelDefinition) ? modelDefinition(tf) : modelDefinition;
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
