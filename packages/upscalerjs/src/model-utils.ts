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
  ModelDefinition,
  ModelDefinitionFn,
  ModelDefinitionObjectOrFn,
  isShape4D, 
  Shape4D, 
  ModelType,
  isFixedShape4D,
  FixedShape4D, 
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

type ParsePatchAndInputShapes = (
  modelPackage: ModelPackage,
  args: UpscaleArgs,
  imageSize: FixedShape4D,
) => {
  modelInputShape?: Shape4D;
} & Pick<UpscaleArgs, 'patchSize' | 'padding'>;
export const parsePatchAndInputShapes: ParsePatchAndInputShapes = (modelPackage, { patchSize, padding, }) => {
  const modelInputShape = getModelInputShape(modelPackage);
  if (patchSize !== undefined && patchSize <= 0) {
    throw GET_INVALID_PATCH_SIZE(patchSize);
  }
  if (isFixedShape4D(modelInputShape)) {
    if (patchSize !== undefined) {
      warn(WARNING_INPUT_SIZE_AND_PATCH_SIZE);
    }

    if (modelInputShape[1] !== modelInputShape[2]) {
      throw MODEL_INPUT_SIZE_MUST_BE_SQUARE;
    }
    return {
      patchSize: modelInputShape[1] - (padding || 0) * 2,
      padding,
      modelInputShape,
    };
  }

  if (patchSize !== undefined && padding === undefined) {
    // warn the user about possible tiling effects if patch size is provided without padding
    warn(WARNING_UNDEFINED_PADDING);
  }

  return {
    patchSize,
    padding,
    modelInputShape,
  };
};
