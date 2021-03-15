import idealoGans from './models/idealo-gans';
import { buildURL, buildConfigURL } from './utils';
const buildModelsConfig = (config) => Object.entries(config).reduce((obj, [key, val]) => ({
    ...obj,
    [key]: {
        ...val,
        url: buildURL(val.urlPath),
        configURL: buildConfigURL(val.urlPath),
    },
}), {});
const MODELS = buildModelsConfig({
    'div2k/rdn-C3-D10-G64-G064-x2': {
        urlPath: 'div2k/005-2x',
        scale: 2,
    },
    'div2k/rdn-C3-D10-G64-G064-x3': {
        urlPath: 'div2k/019-3x',
        scale: 3,
    },
    'div2k/rdn-C3-D10-G64-G064-x4': {
        urlPath: 'div2k/017-4x',
        scale: 4,
    },
    'idealo/psnr-small': {
        urlPath: 'idealo/psnr-small-quant-uint8',
        scale: 2,
    },
    'idealo/gans': idealoGans,
});
export default MODELS;
export const DEFAULT_MODEL = 'idealo/gans';
