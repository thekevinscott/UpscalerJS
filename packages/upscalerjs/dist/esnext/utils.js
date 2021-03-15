export const isString = (pixels) => {
    return typeof pixels === 'string';
};
export const isHTMLImageElement = (pixels) => {
    try {
        return pixels instanceof HTMLImageElement;
    }
    catch (err) {
        // may be in a webworker, or in Node
        return false;
    }
};
export const isFourDimensionalTensor = (pixels) => {
    return pixels.shape.length === 4;
};
const ROOT = 'https://unpkg.com/@upscalerjs/models';
// https://unpkg.com/@upscalerjs/models@0.8.6-alpha.0/index.js
const MODEL_DIR = 'models';
export const buildURL = (modelFolder) => `${ROOT}@latest/${MODEL_DIR}/${modelFolder}/model.json`;
export const buildConfigURL = (modelFolder) => `${ROOT}@latest/${MODEL_DIR}/${modelFolder}/config.json`;
export const warn = (msg) => {
    if (Array.isArray(msg)) {
        // tslint:disable-next-line:no-console
        console.warn(msg.join('\n'));
    }
    else {
        // tslint:disable-next-line:no-console
        console.warn(msg);
    }
};
