import callExec from "../utils/callExec";
import * as path from 'path';
import * as rimraf from 'rimraf';

const ROOT = path.join(__dirname);
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

type Stdout = (data: string) => void;
export const executeNodeScript = async (file: string, stdout?: Stdout) => {
  await callExec(`node "./src/${file}"`, {
    cwd: ROOT
  }, stdout);
};
