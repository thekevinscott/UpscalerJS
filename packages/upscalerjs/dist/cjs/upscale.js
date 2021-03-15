"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.predict = exports.getTensorDimensions = exports.getRowsAndColumns = void 0;
var tf = require("@tensorflow/tfjs");
var image_1 = require("./image");
var tensor_as_base64_1 = require("tensor-as-base64");
var utils_1 = require("./utils");
var ERROR_UNDEFINED_PADDING = 'https://thekevinscott.github.io/UpscalerJS/#/?id=padding-is-undefined';
var getWidthAndHeight = function (tensor) {
    if (tensor.shape.length === 4) {
        return tensor.shape.slice(1, 3);
    }
    if (tensor.shape.length === 3) {
        return tensor.shape.slice(0, 2);
    }
    throw new Error("Invalid shape provided to getWidthAndHeight, expected tensor of rank 3 or 4: " + JSON.stringify(tensor.shape));
};
exports.getRowsAndColumns = function (pixels, patchSize) {
    var _a = getWidthAndHeight(pixels), height = _a[0], width = _a[1];
    return {
        rows: Math.ceil(height / patchSize),
        columns: Math.ceil(width / patchSize),
    };
};
// check that padding has not pushed our origins off the board
var checkAndAdjustStartingPosition = function (dimension, origin, sliceOrigin) {
    // check that our origin is not off the board.
    if (origin[dimension] < 0) {
        // first, find out how much it overhangs
        var amount = 0 - origin[dimension];
        // then, increase origin by that amount (could also just set it to 0.)
        origin[dimension] += amount;
        // and increase sliceOrigin to accommodate
        sliceOrigin[dimension] -= amount;
    }
};
var checkAndAdjustEndingPosition = function (size, dimension, endPosition, origin, sliceOrigin, sliceEndPosition) {
    // check that our final positions are not off the board
    if (endPosition[dimension] > size) {
        // box overhangs in the y direction, bring origin back and cut off the appropriate section.
        // first determine the amount of overhang
        var amount = endPosition[dimension] - size;
        var compensatingAmount = 0;
        if (origin[dimension] - amount < 0) {
            compensatingAmount = 0 - (origin[dimension] - amount);
        }
        // reduce origin to accommodate overhang
        origin[dimension] -= amount - compensatingAmount;
        // then, reduce endPosition by the same amount.
        endPosition[dimension] -= amount;
        // then, increase sliceOrigin amount
        var sliceAmount = amount - compensatingAmount;
        sliceOrigin[dimension] += sliceAmount;
        sliceEndPosition[dimension] += sliceAmount;
    }
};
var checkAndAdjustSliceSize = function (dimension, size, sliceEndPosition) {
    if (sliceEndPosition[dimension] > size[dimension]) {
        sliceEndPosition[dimension] = size[dimension];
    }
};
exports.getTensorDimensions = function (_a) {
    var row = _a.row, col = _a.col, patchSize = _a.patchSize, height = _a.height, width = _a.width, _b = _a.padding, padding = _b === void 0 ? 0 : _b;
    var yPatchSize = patchSize;
    var xPatchSize = patchSize;
    if (yPatchSize > height) {
        yPatchSize = height;
    }
    if (xPatchSize > width) {
        xPatchSize = width;
    }
    var origin = [
        row * patchSize - padding,
        col * patchSize - padding,
    ];
    var sliceOrigin = [padding, padding];
    checkAndAdjustStartingPosition(0, origin, sliceOrigin);
    checkAndAdjustStartingPosition(1, origin, sliceOrigin);
    var endPosition = [
        origin[0] + yPatchSize + padding * 2,
        origin[1] + xPatchSize + padding * 2,
    ];
    var sliceEndPosition = [
        sliceOrigin[0] + yPatchSize,
        sliceOrigin[1] + xPatchSize,
    ];
    checkAndAdjustEndingPosition(height, 0, endPosition, origin, sliceOrigin, sliceEndPosition);
    checkAndAdjustEndingPosition(width, 1, endPosition, origin, sliceOrigin, sliceEndPosition);
    var size = [
        endPosition[0] - origin[0],
        endPosition[1] - origin[1],
    ];
    checkAndAdjustSliceSize(0, size, sliceEndPosition);
    checkAndAdjustSliceSize(1, size, sliceEndPosition);
    var sliceSize = [
        sliceEndPosition[0] - sliceOrigin[0],
        sliceEndPosition[1] - sliceOrigin[1],
    ];
    return {
        origin: origin,
        sliceOrigin: sliceOrigin,
        size: size,
        sliceSize: sliceSize,
    };
};
exports.predict = function (model, pixels, modelDefinition, _a) {
    var _b = _a === void 0 ? {} : _a, progress = _b.progress, patchSize = _b.patchSize, padding = _b.padding;
    return __awaiter(void 0, void 0, void 0, function () {
        var scale, channels, _c, height, width, _d, rows, columns, originalSize, upscaledTensor, total, row, colTensor, col, _e, origin_1, size, sliceOrigin, sliceSize, slicedPixels, prediction, index, slicedPrediction;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    scale = modelDefinition.scale;
                    if (!patchSize) return [3 /*break*/, 16];
                    if (padding === undefined) {
                        utils_1.warn([
                            '"padding" is undefined, but "patchSize" is explicitly defined.',
                            'Without padding, patches of images often have visible artifacting at the seams. Defining an explicit padding will resolve the artifacting.',
                            "For more information, see " + ERROR_UNDEFINED_PADDING + ".",
                            'To hide this warning, pass an explicit padding of "0".',
                        ]);
                    }
                    channels = 3;
                    _c = pixels.shape.slice(1), height = _c[0], width = _c[1];
                    _d = exports.getRowsAndColumns(pixels, patchSize), rows = _d.rows, columns = _d.columns;
                    originalSize = exports.getTensorDimensions({
                        row: 0,
                        col: 0,
                        patchSize: patchSize,
                        height: height,
                        width: width,
                        padding: padding,
                    }).size;
                    upscaledTensor = tf.zeros([
                        1,
                        0,
                        originalSize[1] * scale,
                        channels,
                    ]);
                    total = rows * columns;
                    row = 0;
                    _f.label = 1;
                case 1:
                    if (!(row < rows)) return [3 /*break*/, 15];
                    colTensor = tf.zeros([
                        1,
                        originalSize[0] * scale,
                        0,
                        channels,
                    ]);
                    col = 0;
                    _f.label = 2;
                case 2:
                    if (!(col < columns)) return [3 /*break*/, 11];
                    _e = exports.getTensorDimensions({
                        row: row,
                        col: col,
                        patchSize: patchSize,
                        padding: padding,
                        height: height,
                        width: width,
                    }), origin_1 = _e.origin, size = _e.size, sliceOrigin = _e.sliceOrigin, sliceSize = _e.sliceSize;
                    slicedPixels = pixels.slice([0, origin_1[0], origin_1[1]], [-1, size[0], size[1]]);
                    return [4 /*yield*/, tf.nextFrame()];
                case 3:
                    _f.sent();
                    prediction = model.predict(slicedPixels);
                    return [4 /*yield*/, tf.nextFrame()];
                case 4:
                    _f.sent();
                    slicedPixels.dispose();
                    return [4 /*yield*/, tf.nextFrame()];
                case 5:
                    _f.sent();
                    if (progress) {
                        index = row * columns + col + 1;
                        progress(index / total);
                    }
                    slicedPrediction = prediction.slice([0, sliceOrigin[0] * scale, sliceOrigin[1] * scale], [-1, sliceSize[0] * scale, sliceSize[1] * scale]);
                    return [4 /*yield*/, tf.nextFrame()];
                case 6:
                    _f.sent();
                    prediction.dispose();
                    return [4 /*yield*/, tf.nextFrame()];
                case 7:
                    _f.sent();
                    colTensor = colTensor.concat(slicedPrediction, 2);
                    return [4 /*yield*/, tf.nextFrame()];
                case 8:
                    _f.sent();
                    slicedPrediction.dispose();
                    return [4 /*yield*/, tf.nextFrame()];
                case 9:
                    _f.sent();
                    _f.label = 10;
                case 10:
                    col++;
                    return [3 /*break*/, 2];
                case 11:
                    upscaledTensor = upscaledTensor.concat(colTensor, 1);
                    return [4 /*yield*/, tf.nextFrame()];
                case 12:
                    _f.sent();
                    colTensor.dispose();
                    return [4 /*yield*/, tf.nextFrame()];
                case 13:
                    _f.sent();
                    _f.label = 14;
                case 14:
                    row++;
                    return [3 /*break*/, 1];
                case 15: return [2 /*return*/, upscaledTensor.squeeze()];
                case 16: return [2 /*return*/, tf.tidy(function () {
                        var pred = model.predict(pixels);
                        if (progress) {
                            progress(1);
                        }
                        return pred.squeeze();
                    })];
            }
        });
    });
};
function getProcessedPixels(processFn, upscaledTensor) {
    if (processFn) {
        var postprocessedPixels = processFn(upscaledTensor);
        upscaledTensor.dispose();
        return postprocessedPixels;
    }
    return upscaledTensor;
}
var upscale = function (model, image, modelDefinition, options) {
    if (options === void 0) { options = {}; }
    return __awaiter(void 0, void 0, void 0, function () {
        var _a, pixels, type, preprocessedPixels, upscaledTensor, postprocessedPixels, base64Src;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, image_1.getImageAsPixels(image)];
                case 1:
                    _a = _b.sent(), pixels = _a.tensor, type = _a.type;
                    preprocessedPixels = getProcessedPixels(modelDefinition.preprocess, pixels);
                    return [4 /*yield*/, exports.predict(model, preprocessedPixels, modelDefinition, options)];
                case 2:
                    upscaledTensor = _b.sent();
                    postprocessedPixels = getProcessedPixels(modelDefinition.postprocess, upscaledTensor);
                    if (type !== 'tensor') {
                        // if not a tensor, release the memory, since we retrieved it from a string or HTMLImageElement
                        // if it is a tensor, it is user provided and thus should not be disposed of.
                        pixels.dispose();
                    }
                    if (options.output === 'tensor') {
                        return [2 /*return*/, postprocessedPixels];
                    }
                    base64Src = tensor_as_base64_1.default(postprocessedPixels);
                    postprocessedPixels.dispose();
                    return [2 /*return*/, base64Src];
            }
        });
    });
};
exports.default = upscale;
