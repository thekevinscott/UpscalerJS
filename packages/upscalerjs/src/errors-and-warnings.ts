import {
  ModelDefinition,
  MODEL_DEFINITION_VALIDATION_CHECK_ERROR_TYPE,
} from "@upscalerjs/core";

const WARNING_DEPRECATED_MODEL_DEFINITION_URL =
  'https://upscalerjs.com/documentation/troubleshooting#deprecated-model-definition-function';

export const WARNING_DEPRECATED_MODEL_DEFINITION_FN = [
  'Passing a model definition as a function is deprecated and will be removed in a future version.',
  'To leverage model lifecycle methods, use the setup and teardown methods.',
  `For more information, see ${WARNING_DEPRECATED_MODEL_DEFINITION_URL}.`,
].join(' ');

const WARNING_UNDEFINED_PADDING_URL =
  'https://upscalerjs.com/documentation/troubleshooting#padding-is-undefined';

export const WARNING_UNDEFINED_PADDING = [
  '"padding" is undefined, but "patchSize" is explicitly defined.',
  'Without padding, patches of images often have visible artifacting at the seams. Defining an explicit padding will resolve the artifacting.',
  `For more information, see ${WARNING_UNDEFINED_PADDING_URL}.`,
  'To hide this warning, pass an explicit padding of "0".',
].join(' ');

const WARNING_PROGRESS_WITHOUT_PATCH_SIZE_URL =
  'https://upscalerjs.com/documentation/troubleshooting#progress-specified-without-patch-size';

export const WARNING_PROGRESS_WITHOUT_PATCH_SIZE = [
  'The "progress" callback was provided but "patchSize" was not defined.',
  'Without a "patchSize", the "progress" callback will never be called.',
  `For more information, see ${WARNING_PROGRESS_WITHOUT_PATCH_SIZE_URL}.`,
].join(' ');

const ERROR_INVALID_TENSOR_PREDICTED_URL = 
  'https://upscalerjs.com/documentation/troubleshooting#invalid-predicted-tensor';

export const ERROR_INVALID_TENSOR_PREDICTED = (shape: number[]) => [
  `The tensor returned by the model was not a valid rank-4 tensor. It's shape is ${JSON.stringify(shape)}.}`,
  'UpscalerJS only supports models returning valid image-like data in four dimensional form.',
  `For more information, see ${ERROR_INVALID_TENSOR_PREDICTED_URL}.`,
].join(' ');

const ERROR_INVALID_MODEL_PREDICTION_URL = 
  'https://upscalerjs.com/documentation/troubleshooting#invalid-model-prediction';

export const ERROR_INVALID_MODEL_PREDICTION = [
  'The model output was not a valid tensor. UpscalerJS only supports models returning valid tensors.',
  'This is likely an error with the model itself, not UpscalerJS.',
  `For more information, see ${ERROR_INVALID_MODEL_PREDICTION_URL}.`,
].join(' ');

export const GET_UNDEFINED_TENSORS_ERROR = new Error('No defined tensors were passed to concatTensors');

export class AbortError extends Error {
  message = 'The upscale request received an abort signal';
}

const ERROR_INVALID_MODEL_TYPE_URL = 'https://upscalerjs.com/documentation/troubleshooting#invalid-model-type';
const WARNING_INPUT_SIZE_AND_PATCH_SIZE_URL = 'https://upscalerjs.com/documentation/troubleshooting#input-size-and-patch-size';
const ERROR_WITH_MODEL_INPUT_SHAPE_URL = 'https://upscalerjs.com/documentation/troubleshooting#error-with-model-input-shape';

export const ERROR_INVALID_MODEL_TYPE = (modelType: unknown) => ([
  `You've provided an invalid model type: ${JSON.stringify(modelType)}. Accepted types are "layers" and "graph".`,
  `For more information, see ${ERROR_INVALID_MODEL_TYPE_URL}.`,
].join(' '));
export const ERROR_MODEL_DEFINITION_BUG = 'There is a bug with the upscaler code. Please report this.';
export const WARNING_INPUT_SIZE_AND_PATCH_SIZE = [
  'You have provided a patchSize, but the model definition already includes an input size.',
  'Your patchSize will be ignored.',
  `For more information, see ${WARNING_INPUT_SIZE_AND_PATCH_SIZE_URL}.`,
].join(' ');
export const ERROR_WITH_MODEL_INPUT_SHAPE = (inputShape?: unknown) => [
  `Expected model to have a rank-4 compatible input shape. Instead got: ${JSON.stringify(inputShape)}.`,
  `For more information, see ${ERROR_WITH_MODEL_INPUT_SHAPE_URL}.`,
].join(' ');

export const GET_INVALID_SHAPED_TENSOR = (shape: number[]): Error => new Error(
  `Invalid shape provided to getWidthAndHeight, expected tensor of rank 3 or 4: ${JSON.stringify(
    shape,
  )}`,
);

export const GET_INVALID_PATCH_SIZE = (patchSize: number): Error => new Error([
  `Invalid patch size: ${patchSize}. Patch size must be greater than 0.`,
].join(' '));

export const GET_INVALID_PATCH_SIZE_AND_PADDING = (patchSize: number, padding: number): Error => new Error([
  `Invalid patch size and padding: ${patchSize} and ${padding}. Patch size must be greater than padding * 2.`,
].join(' '));

const WARNING_PATCH_SIZE_INDIVISIBLE_BY_DIVISIBILITY_FACTOR_URL =
  'https://upscalerjs.com/documentation/troubleshooting#patch-size-indivisible-by-divisibility-factor';

export const GET_WARNING_PATCH_SIZE_INDIVISIBLE_BY_DIVISIBILITY_FACTOR = (
  patchSize: number,
  divisibilityFactor: number,
  upscaledPatchSize: number,
): string => [
  `Invalid patch size: ${patchSize}. The model has a defined divibility factor of ${divisibilityFactor} and patch size must be a multiple of this number.`,
  `Patch size has been scaled up to ${upscaledPatchSize}.`,
  `\nFor more information, see ${WARNING_PATCH_SIZE_INDIVISIBLE_BY_DIVISIBILITY_FACTOR_URL}.`,
].join(' ');

export const MODEL_INPUT_SIZE_MUST_BE_SQUARE = new Error([
  'Model input sizes must be square. If you are using a model with a non-square input size and would like to request support,',
  'please file a feature request at https://github.com/thekevinscott/upscalerjs',
].join(' '));

export const MODEL_CONFIGURATION_MISSING_PATH_AND_INTERNALS_URL = 'https://upscalerjs.com/documentation/troubleshooting#missing-path-and-internals';
export const GET_MODEL_CONFIGURATION_MISSING_PATH_AND_INTERNALS = (modelConfiguration: Partial<ModelDefinition>) => [
  'Provided model configuration is missing both a "path" and "_internals". A valid path to a model JSON file must be provided.',
  `For more information, see ${MODEL_CONFIGURATION_MISSING_PATH_AND_INTERNALS_URL}.`,
  `The model configuration provided was: ${JSON.stringify(modelConfiguration)}`,
].join(' ');

export function getModelDefinitionError(error: MODEL_DEFINITION_VALIDATION_CHECK_ERROR_TYPE, modelDefinition?: ModelDefinition): Error {
  switch(error) {
    case MODEL_DEFINITION_VALIDATION_CHECK_ERROR_TYPE.INVALID_MODEL_TYPE:
      return new Error(ERROR_INVALID_MODEL_TYPE(modelDefinition?.modelType));
    case MODEL_DEFINITION_VALIDATION_CHECK_ERROR_TYPE.MISSING_PATH:
      return new Error(GET_MODEL_CONFIGURATION_MISSING_PATH_AND_INTERNALS(modelDefinition));
    default:
      return new Error(ERROR_MODEL_DEFINITION_BUG);
  }
};
