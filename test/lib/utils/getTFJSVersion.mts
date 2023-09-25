import fs from 'fs';
import path from 'path';
import * as url from 'url';
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

const UTILS = path.join(__dirname);
const UPSCALER_PATH = path.join(UTILS, '../../../packages/upscalerjs')
export const getTFJSVersion = () => {
  const packageJSON = JSON.parse(fs.readFileSync(path.join(UPSCALER_PATH, 'package.json'), 'utf-8'));
  const TFJS_VERSION = packageJSON.peerDependencies['@tensorflow/tfjs'];
  return TFJS_VERSION;
}
