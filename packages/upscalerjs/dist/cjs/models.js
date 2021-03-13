"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_MODEL = void 0;
var idealo_gans_1 = require("./models/idealo-gans");
var utils_1 = require("./utils");
var buildModelsConfig = function (config) {
    return Object.entries(config).reduce(function (obj, _a) {
        var _b;
        var key = _a[0], val = _a[1];
        return (__assign(__assign({}, obj), (_b = {}, _b[key] = __assign(__assign({}, val), { url: utils_1.buildURL(val.urlPath), configURL: utils_1.buildConfigURL(val.urlPath) }), _b)));
    }, {});
};
var MODELS = buildModelsConfig({
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
    'idealo/gans': idealo_gans_1.default,
});
exports.default = MODELS;
exports.DEFAULT_MODEL = 'idealo/gans';
