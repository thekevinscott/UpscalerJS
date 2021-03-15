"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.warn = exports.buildConfigURL = exports.buildURL = exports.isFourDimensionalTensor = exports.isHTMLImageElement = exports.isString = void 0;
exports.isString = function (pixels) {
    return typeof pixels === 'string';
};
exports.isHTMLImageElement = function (pixels) {
    try {
        return pixels instanceof HTMLImageElement;
    }
    catch (err) {
        // may be in a webworker, or in Node
        return false;
    }
};
exports.isFourDimensionalTensor = function (pixels) {
    return pixels.shape.length === 4;
};
var ROOT = 'https://unpkg.com/@upscalerjs/models';
// https://unpkg.com/@upscalerjs/models@0.8.6-alpha.0/index.js
var MODEL_DIR = 'models';
exports.buildURL = function (modelFolder) {
    return ROOT + "@latest/" + MODEL_DIR + "/" + modelFolder + "/model.json";
};
exports.buildConfigURL = function (modelFolder) {
    return ROOT + "@latest/" + MODEL_DIR + "/" + modelFolder + "/config.json";
};
exports.warn = function (msg) {
    if (Array.isArray(msg)) {
        // tslint:disable-next-line:no-console
        console.warn(msg.join('\n'));
    }
    else {
        // tslint:disable-next-line:no-console
        console.warn(msg);
    }
};
