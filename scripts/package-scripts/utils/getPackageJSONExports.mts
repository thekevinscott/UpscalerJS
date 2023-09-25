import path from 'path';
import fs from 'fs';

const shouldIncludeExportName = (exportName: string) => {
  if (exportName === '.') {
    return false;
  }

  // TODO: Rethink whether we should deselect any node or node-gpu exports.
  // It seems like the exports field is doing double duty.
  if (exportName.endsWith('node') || exportName.endsWith('node-gpu')) {
    return false;
  }

  return true;
}

export type PackageJSONExport = string | {
  require: string;
  import: string;
};

const isPackageJSONExports = (exports: unknown): exports is {
  [index: string]: PackageJSONExport;
} => {
  if (typeof exports !== 'object' || exports === null) {
    return false;
  };
  return Object.entries(exports).reduce((isValid, [exportName, exportValue]) => {
    return isValid === false ? false : typeof exportValue === 'string' || (typeof exportValue === 'object' && 'require' in exportValue && 'import' in exportValue);
  }, true);
}

export const getPackageJSONExports = (modelFolder: string): Array<[string, PackageJSONExport]> => {
  const packageJSONPath = path.resolve(modelFolder, 'package.json');
  const packageJSON = fs.readFileSync(packageJSONPath, 'utf8');
  const { exports } = JSON.parse(packageJSON);
  if (isPackageJSONExports(exports)) {
    const entries = Object.entries(exports);
    if (entries.length === 1) {
      return entries;
    }
    return entries.filter(([exportName]) => shouldIncludeExportName(exportName));
  }
  throw new Error(`Invalid exports field in package json for ${modelFolder}}: ${JSON.stringify(exports)}`);
};
