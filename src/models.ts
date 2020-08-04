import { IModelDefinition } from './types';

const ROOT = 'https://unpkg.com/upscalerjs-models';
const MODEL_DIR = 'models';

const buildURL = (modelFolder: string) =>
  `${ROOT}@latest/${MODEL_DIR}/${modelFolder}/model.json`;

const MODELS: {
  [index: string]: IModelDefinition;
} = {
  'div2k-2x': {
    url: buildURL('div2k/005-2x'),
    scale: 2,
  },
  'div2k-3x': {
    url: buildURL('div2k/019-3x'),
    scale: 3,
  },
  'div2k-4x': {
    url: buildURL('div2k/017-4x'),
    scale: 4,
  },
  psnr: {
    url: buildURL('psnr-small-quant-uint8'),
    scale: 2,
  },
};

export default MODELS;

export const DEFAULT_MODEL = 'div2k-2x';
