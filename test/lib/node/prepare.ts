import callExec from "../utils/callExec";
import * as path from 'path';
import * as rimraf from 'rimraf';
import * as fs from 'fs';
import { getTFJSVersion } from "../utils/getTFJSVersion";
// import { copyFixtures } from "../utils/copyFixtures";

const ROOT = path.join(__dirname);
// export const DIST = path.join(ROOT, '/dist');
const SRC = path.join(ROOT, '/src');
const NODE_MODULES = path.join(ROOT, '/node_modules');
const UPSCALER_PATH = path.join(ROOT, '../../../packages/upscalerjs')

export const prepareScriptBundleForCJS = async () => {
  rimraf.sync(`${NODE_MODULES}/upscaler`);

  await callExec(`cp -r ${UPSCALER_PATH} ${NODE_MODULES}/upscaler`, {
    cwd: UPSCALER_PATH,
  });
};

export const executeNodeScript = async (scriptPath: string, args: string = '') => {
  await callExec('yarn', {
    cwd: ROOT,
  });
  let data = '';
  await callExec(`node "${scriptPath}" ${args}`, {
    cwd: ROOT
  }, chunk => {
    data += chunk;
  });

  return data.trim();
};
