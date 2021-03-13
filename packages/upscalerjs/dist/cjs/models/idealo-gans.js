"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var tf = require("@tensorflow/tfjs");
var SCALE = 4;
var BETA = 0.2;
var isTensorArray = function (inputs) {
    return Array.isArray(inputs);
};
var getInput = function (inputs) {
    if (isTensorArray(inputs)) {
        return inputs[0];
    }
    return inputs;
};
var MultiplyBeta = /** @class */ (function (_super) {
    __extends(MultiplyBeta, _super);
    function MultiplyBeta() {
        var _this = _super.call(this, {}) || this;
        _this.beta = BETA;
        return _this;
    }
    MultiplyBeta.prototype.call = function (inputs) {
        return tf.mul(getInput(inputs), this.beta);
    };
    MultiplyBeta.className = 'MultiplyBeta';
    return MultiplyBeta;
}(tf.layers.Layer));
var PixelShuffle = /** @class */ (function (_super) {
    __extends(PixelShuffle, _super);
    function PixelShuffle() {
        var _this = _super.call(this, {}) || this;
        _this.scale = SCALE;
        return _this;
    }
    PixelShuffle.prototype.computeOutputShape = function (inputShape) {
        return [inputShape[0], inputShape[1], inputShape[2], 3];
    };
    PixelShuffle.prototype.call = function (inputs) {
        return tf.depthToSpace(getInput(inputs), this.scale, 'NHWC');
    };
    PixelShuffle.className = 'PixelShuffle';
    return PixelShuffle;
}(tf.layers.Layer));
var config = {
    urlPath: 'idealo/gans',
    scale: 4,
    preprocess: function (image) { return tf.div(image, 255); },
    postprocess: function (output) { return tf.mul(output.clipByValue(0, 1), 255); },
    customLayers: [MultiplyBeta, PixelShuffle],
};
exports.default = config;
