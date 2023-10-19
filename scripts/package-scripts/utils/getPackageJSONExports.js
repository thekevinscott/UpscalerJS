"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPackageJSONExports = void 0;
var path_1 = __importDefault(require("path"));
var fs_1 = __importDefault(require("fs"));
var shouldIncludeExportName = function (exportName) {
    if (exportName === '.') {
        return false;
    }
    // TODO: Rethink whether we should deselect any node or node-gpu exports.
    // It seems like the exports field is doing double duty.
    if (exportName.endsWith('node') || exportName.endsWith('node-gpu')) {
        return false;
    }
    return true;
};
var isPackageJSONExports = function (exports) {
    if (typeof exports !== 'object' || exports === null) {
        return false;
    }
    ;
    return Object.entries(exports).reduce(function (isValid, _a) {
        var exportName = _a[0], exportValue = _a[1];
        return isValid === false ? false : typeof exportValue === 'string' || (typeof exportValue === 'object' && 'require' in exportValue && 'import' in exportValue);
    }, true);
};
var getPackageJSONExports = function (modelFolder) {
    var packageJSONPath = path_1.default.resolve(modelFolder, 'package.json');
    var packageJSON = fs_1.default.readFileSync(packageJSONPath, 'utf8');
    var exports = JSON.parse(packageJSON).exports;
    if (isPackageJSONExports(exports)) {
        var entries = Object.entries(exports);
        if (entries.length === 1) {
            return entries;
        }
        return entries.filter(function (_a) {
            var exportName = _a[0];
            return shouldIncludeExportName(exportName);
        });
    }
    throw new Error("Invalid exports field in package json for ".concat(modelFolder, "}: ").concat(JSON.stringify(exports)));
};
exports.getPackageJSONExports = getPackageJSONExports;
