import * as path from 'path';
import * as rimraf from 'rimraf';
import * as fs from 'fs';
import callExec from '../utils/callExec';
import { getTFJSVersion } from '../utils/getTFJSVersion';
import { copyFixtures } from '../utils/copyFixtures';

const ROOT = path.join(__dirname);
export const DIST = path.join(ROOT, '/dist');
const NODE_MODULES = path.join(ROOT, '/node_modules');
const UPSCALER_PATH = path.join(ROOT, '../../../packages/upscalerjs')

const HtmlWebpackPlugin = require("html-webpack-plugin");
const webpack = require('webpack');
let compiler = undefined;

export const prepareScriptBundleForESM = async () => {
  rimraf.sync(DIST);
  rimraf.sync(NODE_MODULES);
  fs.mkdirSync(DIST, { recursive: true });
  fs.mkdirSync(NODE_MODULES, { recursive: true });

  await callExec('yarn install --frozen-lockfile', {
    cwd: UPSCALER_PATH,
  });

  await callExec('yarn build:esm', {
    cwd: UPSCALER_PATH,
  });

  await callExec(`cp -r ${UPSCALER_PATH} ${NODE_MODULES}`, {
    cwd: UPSCALER_PATH,
  });
};

const updateTFJSVersion = () => {
  const packageJSONPath = path.join(__dirname, 'package.json');
  const packageJSON = JSON.parse(fs.readFileSync(packageJSONPath, 'utf-8'));
  packageJSON.dependencies['@tensorflow/tfjs'] = getTFJSVersion();
  fs.writeFileSync(packageJSONPath, JSON.stringify(packageJSON, null, 2), 'utf-8');
};

export const bundleWebpack = () => new Promise(async (resolve, reject) => {
  updateTFJSVersion();
  await callExec('yarn', {
    cwd: ROOT,
  });
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
