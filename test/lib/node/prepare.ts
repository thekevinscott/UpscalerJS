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

// const updateTFJSVersion = () => {
//   const packageJSONPath = path.join(__dirname, 'package.json');
//   const packageJSON = JSON.parse(fs.readFileSync(packageJSONPath, 'utf-8'));
//   packageJSON.dependencies['@tensorflow/tfjs-node'] = getTFJSVersion();
//   fs.writeFileSync(packageJSONPath, JSON.stringify(packageJSON, null, 2), 'utf-8');
// }

// export const prepareNodeDeps = async () => {
//   updateTFJSVersion();
//   await callExec('yarn install --frozen-lockfile', {
//     cwd: ROOT,
//   });
// }

export const prepareScriptBundleForCJS = async () => {
  rimraf.sync(`${NODE_MODULES}/upscaler`);

  await callExec('yarn build:node', {
    cwd: UPSCALER_PATH,
  });

  await callExec(`cp -r ${UPSCALER_PATH} ${NODE_MODULES}/upscaler`, {
    cwd: UPSCALER_PATH,
  });
};

export const executeNodeScript = async () => {
  await callExec('yarn', {
    cwd: ROOT,
  });
  // copyFixtures(DIST);
  // fs.copyFileSync(path.join(SRC, 'index.js'), path.join(DIST, 'index.js'))
  // fs.copyFileSync(path.join(SRC, 'base64ArrayBuffer.js'), path.join(DIST, 'base64ArrayBuffer.js'))
  let data = '';
  await callExec(`node ${SRC}/index.js`, {
    cwd: ROOT
  }, chunk => {
    data += chunk;
  });

  return data.trim();
};
