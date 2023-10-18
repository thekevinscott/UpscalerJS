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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFilteredModels = exports.getAllAvailableModels = exports.getAllAvailableModelPackages = void 0;
var fs_extra_1 = require("fs-extra");
var path_1 = __importDefault(require("path"));
var getPackageJSONExports_1 = require("./getPackageJSONExports");
var ROOT = path_1.default.resolve(__dirname, '../../../');
var MODELS_DIR = path_1.default.resolve(ROOT, 'models');
var EXCLUDED = ['dist', 'types', 'node_modules', 'docs'];
var jsonParse = function (fileName) { return JSON.parse((0, fs_extra_1.readFileSync)(fileName, 'utf-8')); };
var getAllAvailableModelPackages = function (includeExperimental) {
    if (includeExperimental === void 0) { includeExperimental = false; }
    return (0, fs_extra_1.readdirSync)(MODELS_DIR).filter(function (file) {
        var _a, _b;
        var modelDir = path_1.default.resolve(MODELS_DIR, file);
        if (EXCLUDED.includes(file) || !(0, fs_extra_1.lstatSync)(modelDir).isDirectory()) {
            return false;
        }
        var packageJSONPath = path_1.default.resolve(modelDir, 'package.json');
        if (!(0, fs_extra_1.existsSync)(packageJSONPath)) {
            return false;
        }
        if (includeExperimental === false) {
            var packageJSON = JSON.parse((0, fs_extra_1.readFileSync)(packageJSONPath, 'utf-8'));
            var experimental = (_b = (_a = packageJSON['@upscalerjs']) === null || _a === void 0 ? void 0 : _a['model']) === null || _b === void 0 ? void 0 : _b['experimental'];
            return experimental !== true;
        }
        return true;
    });
};
exports.getAllAvailableModelPackages = getAllAvailableModelPackages;
var getAllAvailableModels = function (packageName) {
    var modelPackageDir = path_1.default.resolve(MODELS_DIR, packageName);
    var umdNames = jsonParse(path_1.default.resolve(modelPackageDir, 'umd-names.json'));
    var packageJSONPath = path_1.default.resolve(modelPackageDir, 'package.json');
    var packageJSON = JSON.parse((0, fs_extra_1.readFileSync)(packageJSONPath, 'utf8'));
    return (0, getPackageJSONExports_1.getPackageJSONExports)(modelPackageDir).map(function (_a) {
        var key = _a[0], pathName = _a[1];
        var umdName = umdNames[key];
        if (umdName === undefined) {
            throw new Error("No UMD name defined for ".concat(packageName, "/umd-names.json for ").concat(key));
        }
        var availableModel = {
            export: key,
            esm: key.substring(2),
            cjs: key.substring(2),
            umd: umdName,
            pathName: pathName,
            'umd:main': packageJSON['umd:main'],
            mainUMDName: umdNames['.'],
        };
        return availableModel;
    });
};
exports.getAllAvailableModels = getAllAvailableModels;
var getFilteredModels = function (_a) {
    var _b = _a === void 0 ? {} : _a, specificModel = _b.specificModel, specificPackage = _b.specificPackage, _c = _b.filter, filter = _c === void 0 ? function () { return true; } : _c, _d = _b.includeExperimental, includeExperimental = _d === void 0 ? false : _d;
    var filteredPackagesAndModels = (0, exports.getAllAvailableModelPackages)(includeExperimental).reduce(function (arr, packageName) {
        var models = (0, exports.getAllAvailableModels)(packageName);
        return arr.concat(models.map(function (model) {
            return [packageName, model];
        }));
    }, [])
        .filter(function (_a) {
        var packageName = _a[0], model = _a[1];
        if (specificPackage !== undefined) {
            return packageName === specificPackage;
        }
        return true;
    })
        .filter(function (_a) {
        var _ = _a[0], model = _a[1];
        if (specificModel !== undefined) {
            return model.esm === specificModel;
        }
        return true;
    })
        .filter(function (_a) {
        var packageName = _a[0], model = _a[1];
        return filter(packageName, model);
    });
    if (filteredPackagesAndModels.length === 0) {
        var allPackages = (0, exports.getAllAvailableModelPackages)().map(function (packageName) {
            return __spreadArray([
                "- ".concat(packageName)
            ], (0, exports.getAllAvailableModels)(packageName).map(function (m) { return "  - ".concat(m.esm); }), true).join('\n');
        });
        throw new Error(__spreadArray([
            'No models were found for filter',
            'Available models:'
        ], allPackages, true).join('\n'));
    }
    var filteredPackagesAndModelsObj = filteredPackagesAndModels.reduce(function (obj, _a) {
        var _b;
        var packageName = _a[0], model = _a[1];
        return (__assign(__assign({}, obj), (_b = {}, _b[packageName] = (obj[packageName] || []).concat([model]), _b)));
    }, {});
    return Object.entries(filteredPackagesAndModelsObj);
};
exports.getFilteredModels = getFilteredModels;
