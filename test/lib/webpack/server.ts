import * as http from 'http';
import * as path from 'path';
import handler from 'serve-handler';
import * as rimraf from 'rimraf';
import * as fs from 'fs';

const ROOT = path.join(__dirname);
const DIST = path.join(ROOT, '/dist');
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

export const prepareScriptBundle = async () => {
  rimraf.sync(DIST);
  fs.mkdirSync(DIST, { recursive: true });
  rimraf.sync(NODE_MODULES);
  fs.mkdirSync(NODE_MODULES, { recursive: true });

  await callExec('yarn build:esm', {
    cwd: UPSCALER_PATH,
  });


  await callExec(`mv ${UPSCALER_PATH} ${NODE_MODULES}`, {
    cwd: UPSCALER_PATH,
  });

  fs.copyFileSync(path.join(UPSCALER_PATH, 'dist/umd/upscaler.min.js'), path.join(DIST, 'upscaler.min.js'))

  fs.copyFileSync(path.join(ROOT, 'src/flower.png'), path.join(DIST, 'flower.png'))
  fs.copyFileSync(path.join(ROOT, 'src/flower-small.png'), path.join(DIST, 'flower-small.png'))
  fs.copyFileSync(path.join(ROOT, 'src/index.html'), path.join(DIST, 'index.html'))
};

export const bundleWebpack = () => new Promise(async (resolve, reject) => {
  await prepareScriptBundle();
    const entryFiles = path.join(ROOT, 'index.js');

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

type Callback = () => void;
type StartServer = (PORT: number, callback?: Callback) => Promise<http.Server>;
export const startServer: StartServer = (PORT, callback) => new Promise(async resolve => {
  try {
    const server = http.createServer((request, response) => handler(request, response, {
      public: DIST,
    }));
    server.listen(PORT, () => {
      if (callback) { callback(); }
      resolve(server);
    });
  } catch (err) {
    console.error(err);
    throw err;
  }
});

