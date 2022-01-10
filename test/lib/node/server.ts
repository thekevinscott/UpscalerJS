import callExec from "../utils/callExec";
import * as path from 'path';
import * as rimraf from 'rimraf';
import * as fs from 'fs';

const ROOT = path.join(__dirname);
export const DIST = path.join(ROOT, '/dist');
const NODE_MODULES = path.join(ROOT, '/node_modules');
const UPSCALER_PATH = path.join(ROOT, '../../../packages/upscalerjs')

export const prepareNodeDeps = async () => {
  await callExec('yarn', {
    cwd: ROOT,
  });
}

export const prepareScriptBundleForNode = async () => {
  rimraf.sync(DIST);
  rimraf.sync(`${NODE_MODULES}/upscaler`);

  await callExec('yarn build:cjs', {
    cwd: UPSCALER_PATH,
  });

  await callExec(`cp -r ${UPSCALER_PATH} ${NODE_MODULES}`, {
    cwd: UPSCALER_PATH,
  });
};

export const executeNodeScript = async () => {
  let data = '';
  await callExec(`node index.js`, {
    cwd: ROOT
  }, chunk => {
    data += chunk;
  });

  return `data:image/png;base64,${data}`;
};
