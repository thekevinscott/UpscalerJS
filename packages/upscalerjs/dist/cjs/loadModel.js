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
exports.getModelDescription = exports.getModelDefinitions = exports.prepareModelDefinitions = exports.getModelDefinition = exports.checkDeprecatedModels = exports.warnDeprecatedModel = void 0;
var tf = require("@tensorflow/tfjs");
var models_1 = require("./models");
var utils_1 = require("./utils");
var ERROR_URL_EXPLICIT_SCALE_REQUIRED = 'https://thekevinscott.github.io/UpscalerJS/#/?id=you-must-provide-an-explicit-scale';
var ERROR_URL_EXPLICIT_SCALE_DISALLOWED = 'https://thekevinscott.github.io/UpscalerJS/#/?id=you-are-requesting-the-pretrained-model-but-are-providing-an-explicit-scale';
exports.warnDeprecatedModel = function (key, nextKey, expirationVersion) {
    return utils_1.warn([
        "The key " + key + " has been deprecated and will be removed in the next release (" + expirationVersion + ").",
        "Please switch to the following key: " + nextKey,
    ]);
};
var DEPRECATION_WARNINGS = {
    'div2k-2x': ['div2k-2x', 'div2k/rdn-C3-D10-G64-G064-x2', '0.8.0'],
    'div2k-3x': ['div2k-3x', 'div2k/rdn-C3-D10-G64-G064-x3', '0.8.0'],
    'div2k-4x': ['div2k-4x', 'div2k/rdn-C3-D10-G64-G064-x4', '0.8.0'],
    psnr: ['psnr', 'idealo/psnr-small', '0.8.0'],
};
exports.checkDeprecatedModels = function (warnings, model) {
    var deprecationWarning = warnings[model];
    if (deprecationWarning) {
        exports.warnDeprecatedModel.apply(void 0, deprecationWarning);
    }
};
exports.getModelDefinition = function (_a) {
    var _b = _a === void 0 ? {} : _a, _c = _b.model, model = _c === void 0 ? models_1.DEFAULT_MODEL : _c, scale = _b.scale;
    if (model in models_1.default) {
        var modelDefinition = models_1.default[model];
        if (modelDefinition.deprecated) {
            exports.checkDeprecatedModels(DEPRECATION_WARNINGS, model);
        }
        if (scale) {
            throw new Error([
                "You are requesting the pretrained model " + model + " but are providing an explicit scale.",
                'This is not allowed.',
                "For more details, see " + ERROR_URL_EXPLICIT_SCALE_DISALLOWED,
            ].join(' '));
        }
        return modelDefinition;
    }
    if (!scale) {
        throw new Error([
            "If providing a custom model, you must provide an explicit scale.",
            "For more details, see " + ERROR_URL_EXPLICIT_SCALE_REQUIRED,
        ].join(' '));
    }
    return {
        url: model,
        scale: scale,
    };
};
var loadModel = function (opts) { return __awaiter(void 0, void 0, void 0, function () {
    var modelDefinition, model;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                modelDefinition = exports.getModelDefinition(opts);
                if (modelDefinition.customLayers) {
                    modelDefinition.customLayers.forEach(function (layer) {
                        tf.serialization.registerClass(layer);
                    });
                }
                return [4 /*yield*/, tf.loadLayersModel(modelDefinition.url)];
            case 1:
                model = _a.sent();
                return [2 /*return*/, {
                        model: model,
                        modelDefinition: modelDefinition,
                    }];
        }
    });
}); };
exports.default = loadModel;
var modelDefinitions;
exports.prepareModelDefinitions = function (preparedModelDefinitions) {
    if (preparedModelDefinitions === void 0) { preparedModelDefinitions = {}; }
    return __awaiter(void 0, void 0, void 0, function () {
        var entries;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    entries = Object.entries(models_1.default);
                    return [4 /*yield*/, Promise.all(entries.map(function (_a) {
                            var key = _a[0], val = _a[1];
                            return __awaiter(void 0, void 0, void 0, function () {
                                var config;
                                return __generator(this, function (_b) {
                                    switch (_b.label) {
                                        case 0: return [4 /*yield*/, exports.getModelDescription(val)];
                                        case 1:
                                            config = _b.sent();
                                            preparedModelDefinitions[key] = __assign(__assign({}, val), { description: config });
                                            return [2 /*return*/];
                                    }
                                });
                            });
                        }))];
                case 1:
                    _a.sent();
                    return [2 /*return*/, preparedModelDefinitions];
            }
        });
    });
};
exports.getModelDefinitions = function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!!modelDefinitions) return [3 /*break*/, 2];
                return [4 /*yield*/, exports.prepareModelDefinitions()];
            case 1:
                modelDefinitions = _a.sent();
                _a.label = 2;
            case 2: return [2 /*return*/, modelDefinitions];
        }
    });
}); };
exports.getModelDescription = function (val) { return __awaiter(void 0, void 0, void 0, function () {
    var response, err_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                if (!val.configURL) return [3 /*break*/, 2];
                return [4 /*yield*/, fetch(val.configURL).then(function (resp) { return resp.json(); })];
            case 1:
                response = _a.sent();
                return [2 /*return*/, response.description];
            case 2: return [3 /*break*/, 4];
            case 3:
                err_1 = _a.sent();
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/, ''];
        }
    });
}); };
