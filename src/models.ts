const ROOT = 'https://unpkg.com/upscaler'
const MODEL_DIR = 'models';
const { version } = require('../package.json');

const buildURL = (modelFolder: string) => {
  return `${ROOT}@${version}/${MODEL_DIR}/${modelFolder}/model.json`;
};

interface IModels {
  [index: string]: {
    url: string;
  }
}

const MODELS: IModels = {
  '2x': {
    url: buildURL('div2k-006-2x'),
  },
  '3x': {
    url: buildURL('div2k-019-3x'),
  },
  '4x': {
    url: buildURL('div2k-017-4x'),
  },
  'psnr_small': {
    url: buildURL('psnr-small-quant-uint8'),
  },
}

export default MODELS;

export const DEFAULT_MODEL = '2x';
