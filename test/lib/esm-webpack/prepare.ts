import * as path from 'path';
import * as rimraf from 'rimraf';
import * as fs from 'fs';
import callExec from '../utils/callExec';
import { getTFJSVersion } from '../utils/getTFJSVersion';
import { copyFixtures } from '../utils/copyFixtures';

const ROOT = path.join(__dirname);
export const DIST = path.join(ROOT, '/dist');
const NODE_MODULES = path.join(ROOT, '/node_modules');
import { updateTFJSVersion } from '../utils/updateTFJSVersion';
import webpack from 'webpack';
import HtmlWebpackPlugin from 'html-webpack-plugin';

const ROOT = path.join(__dirname);
const UPSCALER_PATH = path.join(ROOT, '../../../packages/upscalerjs')
let compiler = undefined;

export const prepareScriptBundleForESM = async () => {
  rimraf.sync(DIST);
  // rimraf.sync(NODE_MODULES);
  fs.mkdirSync(DIST, { recursive: true });
  // fs.mkdirSync(NODE_MODULES, { recursive: true });

  // await callExec('yarn install --frozen-lockfile', {
  //   cwd: UPSCALER_PATH,
  // });

  await callExec('yarn build:esm', {
    cwd: UPSCALER_PATH,
  });

  await callExec(`cp -r ${UPSCALER_PATH} ${NODE_MODULES}`, {
    cwd: UPSCALER_PATH,
  });
};

export const bundleWebpack = () => new Promise(async (resolve, reject) => {
  await updateTFJSVersion(ROOT);
  // await callExec('yarn install --frozen-lockfile', {
  //   cwd: ROOT,
  // });
  copyFixtures(DIST);

  const entryFiles = path.join(ROOT, 'src/index.js');

  compiler = webpack({
    mode: 'production',
    context: ROOT,
    entry: entryFiles,
    stats: 'errors-only',
    plugins: [new HtmlWebpackPlugin({
      title: 'UpscalerJS Integration Test Webpack Bundler Server',
    })],
    output: {
      path: DIST,
    },
    module: {
      rules: [
        {
          test: /\.(png|svg|jpg|jpeg|gif|json|bin)$/i,
          type: 'asset/resource',
        },
      ],
    },
  });

  compiler.run((err, stats) => {
    if (err || stats.hasErrors()) {
      reject(err || stats.toJson('errors-only').errors.map(e => e.message));
    } else {
      resolve();
    }
  });

  return compiler;
});
