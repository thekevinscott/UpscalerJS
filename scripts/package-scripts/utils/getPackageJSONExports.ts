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

export const getPackageJSONExports = (modelFolder: string): Array<string> => {
  const packageJSONPath = path.resolve(modelFolder, 'package.json');
  const packageJSON = fs.readFileSync(packageJSONPath, 'utf8');
  const { exports } = JSON.parse(packageJSON);
  const keys = Object.keys(exports);
  if (keys.length === 1) {
    return keys;
  }
  return Object.keys(exports).filter(shouldIncludeExportName);
};
