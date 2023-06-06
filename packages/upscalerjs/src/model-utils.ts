import { tf, } from './dependencies.generated';

import { isLayersModel, } from './isLayersModel';
import {
  ERROR_WITH_MODEL_INPUT_SHAPE,
  GET_INVALID_PATCH_SIZE,
  GET_WARNING_PATCH_SIZE_INDIVISIBLE_BY_DIVISIBILITY_FACTOR,
  MODEL_INPUT_SIZE_MUST_BE_SQUARE,
  WARNING_INPUT_SIZE_AND_PATCH_SIZE,
  WARNING_UNDEFINED_PADDING,
  GET_INVALID_PATCH_SIZE_AND_PADDING,
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

export const getPatchSizeAsMultiple = (divisibilityFactor: number, patchSize: number): number => {
  return Math.ceil(patchSize / divisibilityFactor) * divisibilityFactor;
};

type ParsePatchAndInputShapes = (
  modelPackage: ModelPackage,
  args: UpscaleArgs,
  imageSize: FixedShape4D,
) => {
  modelInputShape?: Shape4D;
} & Pick<UpscaleArgs, 'patchSize' | 'padding'>;
export const parsePatchAndInputShapes: ParsePatchAndInputShapes = (modelPackage, { patchSize, padding, }, imageSize) => {
  const modelInputShape = getModelInputShape(modelPackage);
  if (patchSize !== undefined) {
    if (patchSize <= 0) {
      throw GET_INVALID_PATCH_SIZE(patchSize);
    }
    if (padding !== undefined && padding * 2 >= patchSize) {
      throw GET_INVALID_PATCH_SIZE_AND_PADDING(patchSize, padding);
    }
  }

  if (isFixedShape4D(modelInputShape)) {
    if (patchSize !== undefined) {
      warn(WARNING_INPUT_SIZE_AND_PATCH_SIZE);
    }

    if (modelInputShape[1] !== modelInputShape[2]) {
      throw MODEL_INPUT_SIZE_MUST_BE_SQUARE;
    }

    return {
      patchSize: modelInputShape[1],
      padding,
      modelInputShape,
    };
  }

  if (patchSize !== undefined && padding === undefined) {
    // warn the user about possible tiling effects if patch size is provided without padding
    warn(WARNING_UNDEFINED_PADDING);
  }

  const { divisibilityFactor, } = modelPackage.modelDefinition;
  if (divisibilityFactor !== undefined) {
    if (patchSize !== undefined) {
      const multipliedPatchSize = getPatchSizeAsMultiple(divisibilityFactor, patchSize);
      if (multipliedPatchSize !== patchSize) {
        warn(GET_WARNING_PATCH_SIZE_INDIVISIBLE_BY_DIVISIBILITY_FACTOR(patchSize, divisibilityFactor, multipliedPatchSize));
      }
      return {
        patchSize: multipliedPatchSize,
        padding,
        modelInputShape: [null, multipliedPatchSize, multipliedPatchSize, 3,],
      };
    }

    // pad the image up to the multipled image size
    return {
      patchSize: undefined,
      padding: undefined,
      modelInputShape: [
        null,
        getPatchSizeAsMultiple(divisibilityFactor, imageSize[1]),
        getPatchSizeAsMultiple(divisibilityFactor, imageSize[2]),
        3,
      ],
    };
  }
  
  return {
    patchSize,
    padding,
    modelInputShape: undefined,
  };
};
