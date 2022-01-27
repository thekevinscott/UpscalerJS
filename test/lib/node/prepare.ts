import callExec from "../utils/callExec";
import * as path from 'path';
import * as rimraf from 'rimraf';

const ROOT = path.join(__dirname);
const SRC = path.join(ROOT, '/src');
const NODE_MODULES = path.join(ROOT, '/node_modules');
const UPSCALER_PATH = path.join(ROOT, '../../../packages/upscalerjs')

export const prepareScriptBundleForCJS = async () => {
  await callExec('yarn', {
    cwd: ROOT,
  });

  rimraf.sync(`${NODE_MODULES}/upscaler`);

  await callExec(`cp -r ${UPSCALER_PATH} ${NODE_MODULES}/upscaler`, {
    cwd: UPSCALER_PATH,
  });
};

export const executeNodeScript = async (scriptPath: string, args: string = '') => {
  let data = '';
  await callExec(`node "./src/upscale_image.js" ${args}`, {
    cwd: ROOT
  }, chunk => {
    data += chunk;
  });

  return data.trim();
};
