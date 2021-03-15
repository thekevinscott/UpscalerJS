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
var tf = require("@tensorflow/tfjs");
var isWarmupSizeByPatchSize = function (size) {
    return 'patchSize' in size;
};
var warmup = function (modelPackage, sizes) { return __awaiter(void 0, void 0, void 0, function () {
    var model, _i, sizes_1, size, patchSize, _a, padding, amount, pred, width, height, pred;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0: return [4 /*yield*/, tf.nextFrame()];
            case 1:
                _b.sent();
                return [4 /*yield*/, modelPackage];
            case 2:
                model = (_b.sent()).model;
                _i = 0, sizes_1 = sizes;
                _b.label = 3;
            case 3:
                if (!(_i < sizes_1.length)) return [3 /*break*/, 10];
                size = sizes_1[_i];
                if (!isWarmupSizeByPatchSize(size)) return [3 /*break*/, 6];
                patchSize = size.patchSize, _a = size.padding, padding = _a === void 0 ? 0 : _a;
                amount = patchSize + padding * 2;
                return [4 /*yield*/, model.predict(tf.zeros([1, amount, amount, 3]))];
            case 4:
                pred = (_b.sent());
                return [4 /*yield*/, tf.nextFrame()];
            case 5:
                _b.sent();
                pred.dataSync();
                pred.dispose();
                return [3 /*break*/, 9];
            case 6:
                if (typeof size[0] !== 'number' || typeof size[1] !== 'number') {
                    throw new Error("Invalid value passed to warmup in warmupSizes. Expected two numbers, got " + size.join(','));
                }
                width = size[0], height = size[1];
                return [4 /*yield*/, model.predict(tf.zeros([1, height, width, 3]))];
            case 7:
                pred = (_b.sent());
                return [4 /*yield*/, tf.nextFrame()];
            case 8:
                _b.sent();
                pred.dataSync();
                pred.dispose();
                _b.label = 9;
            case 9:
                _i++;
                return [3 /*break*/, 3];
            case 10: return [2 /*return*/];
        }
    });
}); };
exports.default = warmup;
