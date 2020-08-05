import { IModelDefinition } from './types';

const ROOT = 'https://unpkg.com/upscalerjs-models';
const MODEL_DIR = 'models';

const buildURL = (modelFolder: string) =>
  `${ROOT}@latest/${MODEL_DIR}/${modelFolder}/model.json`;

export const buildConfigURL = (modelFolder: string) =>
  `${ROOT}@latest/${MODEL_DIR}/${modelFolder}/config.json`;

const MODELS: {
  [index: string]: IModelDefinition;
} = {
  'div2k-2x': {
    url: buildURL('div2k/005-2x'),
    scale: 2,
    deprecated: true,
    configURL: buildConfigURL('div2k/005-2x'),
  },
  'div2k-3x': {
    url: buildURL('div2k/019-3x'),
    scale: 3,
    deprecated: true,
    configURL: buildConfigURL('div2k/019-3x'),
  },
  'div2k-4x': {
    url: buildURL('div2k/017-4x'),
    scale: 4,
    deprecated: true,
    configURL: buildConfigURL('div2k/017-4x'),
  },
  'div2k/rdn-C3-D10-G64-G064-x2': {
    url: buildURL('div2k/005-2x'),
    scale: 2,
    configURL: buildConfigURL('div2k/005-2x'),
  },
  'div2k/rdn-C3-D10-G64-G064-x3': {
    url: buildURL('div2k/019-3x'),
    scale: 3,
    configURL: buildConfigURL('div2k/019-3x'),
  },
  'div2k/rdn-C3-D10-G64-G064-x4': {
    url: buildURL('div2k/017-4x'),
    scale: 4,
    configURL: buildConfigURL('div2k/017-4x'),
  },
  psnr: {
    url: buildURL('psnr-small-quant-uint8'),
    configURL: buildConfigURL('psnr-small-quant-uint8'),
    scale: 2,
  },
};

export default MODELS;

export const DEFAULT_MODEL = 'div2k-2x';
