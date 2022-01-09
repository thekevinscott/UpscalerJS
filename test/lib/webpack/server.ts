import * as path from 'path';
import * as rimraf from 'rimraf';
import * as fs from 'fs';

const ROOT = path.join(__dirname);
export const DIST = path.join(ROOT, '/dist');
const NODE_MODULES = path.join(ROOT, '/node_modules');
const UPSCALER_PATH = path.join(ROOT, '../../../packages/upscalerjs')

const { exec } = require("child_process");
const callExec = (cmd: string, options: any) => new Promise((resolve, reject) => {
  const spawnedProcess = exec(cmd, options, (error) => {
    if (error) {
      reject(error.message);
    } else {
      resolve();
    }
  });
  spawnedProcess.stdout.pipe(process.stdout);
  spawnedProcess.stderr.pipe(process.stderr);

})

const HtmlWebpackPlugin = require("html-webpack-plugin");
const webpack = require('webpack');
let compiler = undefined;

export const prepareScriptBundleForWebpack = async () => {
  rimraf.sync(DIST);
  rimraf.sync(NODE_MODULES);
  fs.mkdirSync(NODE_MODULES, { recursive: true });

  await callExec('yarn build:esm', {
    cwd: UPSCALER_PATH,
  });

  await callExec(`cp -r ${UPSCALER_PATH} ${NODE_MODULES}`, {
    cwd: UPSCALER_PATH,
  });
};

export const bundleWebpack = () => new Promise(async (resolve, reject) => {
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
          test: /\.(png|svg|jpg|jpeg|gif)$/i,
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
