import * as tf from '@tensorflow/tfjs';
import MODELS, { DEFAULT_MODEL } from './models';
import { warn } from './utils';
const ERROR_URL_EXPLICIT_SCALE_REQUIRED = 'https://thekevinscott.github.io/UpscalerJS/#/?id=you-must-provide-an-explicit-scale';
const ERROR_URL_EXPLICIT_SCALE_DISALLOWED = 'https://thekevinscott.github.io/UpscalerJS/#/?id=you-are-requesting-the-pretrained-model-but-are-providing-an-explicit-scale';
export const warnDeprecatedModel = (key, nextKey, expirationVersion) => warn([
    `The key ${key} has been deprecated and will be removed in the next release (${expirationVersion}).`,
    `Please switch to the following key: ${nextKey}`,
]);
const DEPRECATION_WARNINGS = {
    'div2k-2x': ['div2k-2x', 'div2k/rdn-C3-D10-G64-G064-x2', '0.8.0'],
    'div2k-3x': ['div2k-3x', 'div2k/rdn-C3-D10-G64-G064-x3', '0.8.0'],
    'div2k-4x': ['div2k-4x', 'div2k/rdn-C3-D10-G64-G064-x4', '0.8.0'],
    psnr: ['psnr', 'idealo/psnr-small', '0.8.0'],
};
export const checkDeprecatedModels = (warnings, model) => {
    const deprecationWarning = warnings[model];
    if (deprecationWarning) {
        warnDeprecatedModel(...deprecationWarning);
    }
};
export const getModelDefinition = ({ model = DEFAULT_MODEL, scale, } = {}) => {
    if (model in MODELS) {
        const modelDefinition = MODELS[model];
        if (modelDefinition.deprecated) {
            checkDeprecatedModels(DEPRECATION_WARNINGS, model);
        }
        if (scale) {
            throw new Error([
                `You are requesting the pretrained model ${model} but are providing an explicit scale.`,
                'This is not allowed.',
                `For more details, see ${ERROR_URL_EXPLICIT_SCALE_DISALLOWED}`,
            ].join(' '));
        }
        return modelDefinition;
    }
    if (!scale) {
        throw new Error([
            `If providing a custom model, you must provide an explicit scale.`,
            `For more details, see ${ERROR_URL_EXPLICIT_SCALE_REQUIRED}`,
        ].join(' '));
    }
    return {
        url: model,
        scale,
    };
};
const loadModel = async (opts) => {
    const modelDefinition = getModelDefinition(opts);
    if (modelDefinition.customLayers) {
        modelDefinition.customLayers.forEach((layer) => {
            tf.serialization.registerClass(layer);
        });
    }
    const model = await tf.loadLayersModel(modelDefinition.url);
    return {
        model,
        modelDefinition,
    };
};
export default loadModel;
let modelDefinitions;
export const prepareModelDefinitions = async (preparedModelDefinitions = {}) => {
    const entries = Object.entries(MODELS);
    await Promise.all(entries.map(async ([key, val]) => {
        const config = await getModelDescription(val);
        preparedModelDefinitions[key] = {
            ...val,
            description: config,
        };
    }));
    return preparedModelDefinitions;
};
export const getModelDefinitions = async () => {
    if (!modelDefinitions) {
        modelDefinitions = await prepareModelDefinitions();
    }
    return modelDefinitions;
};
export const getModelDescription = async (val) => {
    try {
        if (val.configURL) {
            const response = await fetch(val.configURL).then((resp) => resp.json());
            return response.description;
        }
    }
    catch (err) { }
    return '';
};
