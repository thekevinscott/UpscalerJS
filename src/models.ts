const ROOT = 'https://unpkg.com/upscaler'
const MODEL_DIR = 'models';
import * as pkg from '../package.json';
const { version } = pkg;

const buildURL = (modelFolder: string) => {
  return `${ROOT}@${version}/${MODEL_DIR}/${modelFolder}/model.json`;
};

const MODELS = {
  '2x': {
    url: buildURL('div2k-006-2x'),
  },
  '3x': {
    url: buildURL('div2k-019-3x'),
  },
  'psnr_small': {
    url: buildURL('psnr-small-quant-uint8'),
  },
}

export default MODELS;
