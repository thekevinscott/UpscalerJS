import fs from 'fs';
import path from 'path';
import { getTFJSVersion } from '../utils/getTFJSVersion';
import callExec from '../utils/callExec';

export const updateTFJSVersion = async (dirname: string) => {
  const packageJSONPath = path.join(dirname, 'package.json');
  const packageJSON = JSON.parse(fs.readFileSync(packageJSONPath, 'utf-8'));
  const currentTFJSVersion = getTFJSVersion();
  if (currentTFJSVersion !== packageJSON.dependencies['@tensorflow/tfjs']) {
    packageJSON.dependencies['@tensorflow/tfjs'] = getTFJSVersion();
    fs.writeFileSync(packageJSONPath, JSON.stringify(packageJSON, null, 2), 'utf-8');
    await callExec('pnpm', {
      cwd: dirname,
    });
  }
};
