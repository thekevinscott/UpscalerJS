import { tf, } from './dependencies.generated';
import { IUpscalerOptions, IModelDefinition, } from './types';
import MODELS, { DEFAULT_MODEL, } from './models';
import { warn, } from './utils';

const ERROR_URL_EXPLICIT_SCALE_REQUIRED =
  'https://thekevinscott.github.io/UpscalerJS/#/?id=you-must-provide-an-explicit-scale';
const ERROR_URL_EXPLICIT_SCALE_DISALLOWED =
  'https://thekevinscott.github.io/UpscalerJS/#/?id=you-are-requesting-the-pretrained-model-but-are-providing-an-explicit-scale';

export const warnDeprecatedModel = (
  key: string,
  nextKey: string,
  expirationVersion: string,
) =>
  warn([
    `The key ${key} has been deprecated and will be removed in the next release (${expirationVersion}).`,
    `Please switch to the following key: ${nextKey}`,
  ]);

export interface DeprecationWarnings {
  [index: string]: [string, string, string];
}

const DEPRECATION_WARNINGS: DeprecationWarnings = {
  'div2k-2x': ['div2k-2x', 'div2k/rdn-C3-D10-G64-G064-x2', '0.8.0',],
  'div2k-3x': ['div2k-3x', 'div2k/rdn-C3-D10-G64-G064-x3', '0.8.0',],
  'div2k-4x': ['div2k-4x', 'div2k/rdn-C3-D10-G64-G064-x4', '0.8.0',],
  psnr: ['psnr', 'idealo/psnr-small', '0.8.0',],
};

export const checkDeprecatedModels = (
  warnings: DeprecationWarnings,
  model: string,
) => {
  const deprecationWarning = warnings[model];
  if (deprecationWarning) {
    warnDeprecatedModel(...deprecationWarning);
  }
};

export const getModelDefinition = ({
  model = DEFAULT_MODEL,
  scale,
}: IUpscalerOptions = {}): IModelDefinition => {
  if (model in MODELS) {
    const modelDefinition = MODELS[model];
    if (modelDefinition.deprecated) {
      checkDeprecatedModels(DEPRECATION_WARNINGS, model);
    }
    if (scale) {
      throw new Error(
        [
          `You are requesting the pretrained model ${model} but are providing an explicit scale.`,
          'This is not allowed.',
          `For more details, see ${ERROR_URL_EXPLICIT_SCALE_DISALLOWED}`,
        ].join(' '),
      );
    }
    return modelDefinition;
  }

  if (!scale) {
    throw new Error(
      [
        `If providing a custom model, you must provide an explicit scale.`,
        `For more details, see ${ERROR_URL_EXPLICIT_SCALE_REQUIRED}`,
      ].join(' '),
    );
  }

  return {
    url: model,
    scale,
  };
};

const models: Record<string, tf.LayersModel> = {};

const loadModel = async (
  opts: IUpscalerOptions,
): Promise<{
  model: tf.LayersModel;
  modelDefinition: IModelDefinition;
}> => {
  const modelDefinition = getModelDefinition(opts);
  if (modelDefinition.customLayers) {
    modelDefinition.customLayers.forEach((layer) => {
      tf.serialization.registerClass(layer);
    });
  }

  if (!models[modelDefinition.url]) {
    models[modelDefinition.url] = await tf.loadLayersModel(modelDefinition.url);
  }

  return {
    model: models[modelDefinition.url],
    modelDefinition,
  } as any;
};

export default loadModel;

type ModelDefinitions = {
  [index: string]: IModelDefinition;
};

let modelDefinitions: undefined | ModelDefinitions;

export const getModelDescription = async (
  val: IModelDefinition,
): Promise<string> => {
  try {
    if (val.configURL) {
      const response = await fetch(val.configURL).then((resp) => resp.json()) as { description: string };
      return response.description;
    }
  } catch (err) { }
  return '';
};

export const prepareModelDefinitions = async (
  preparedModelDefinitions: ModelDefinitions = {},
) => {
  const entries = Object.entries(MODELS);
  await Promise.all(
    entries.map(async ([key, val,]) => {
      const config = await getModelDescription(val);
      preparedModelDefinitions[key] = {
        ...val,
        description: config,
      };
    }),
  );

  return preparedModelDefinitions;
};

export const getModelDefinitions = async () => {
  if (!modelDefinitions) {
    modelDefinitions = await prepareModelDefinitions();
  }
  return modelDefinitions;
};
