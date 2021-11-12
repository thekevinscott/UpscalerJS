import * as fs from 'fs';
import * as http from 'http';
import * as path from 'path';
import * as esbuild from 'esbuild';
import * as rimraf from 'rimraf';
import handler from 'serve-handler';

const ROOT = path.join(__dirname);
const DIST = path.join(ROOT, '/dist');

export const bundle = () => {
  rimraf.sync(DIST);
  const entryFiles = path.join(ROOT, 'src/index.js');
  try {
    esbuild.buildSync({
      entryPoints: [entryFiles],
      bundle: true,
      tsconfig: path.resolve(__dirname, '../../tsconfig.json'),
      loader: {
        '.png': 'file',
      },
      outdir: DIST,
    });
    fs.copyFileSync(path.join(ROOT, 'src/index.html'), path.join(DIST,'index.html'))
  } catch (err) {
    console.error(err);
  }
}

// const HtmlWebpackPlugin = require("html-webpack-plugin");
// const webpack = require('webpack');
// let compiler = undefined;
// export const bundleWebpack = () => new Promise((resolve, reject) => {
//   if (compiler === undefined) {
//     const entryFiles = path.join(ROOT, 'index.js');

//     compiler = webpack({
//       mode: 'production',
//       context: ROOT,
//       entry: entryFiles,
//       stats: 'errors-only',
//       plugins: [new HtmlWebpackPlugin({
//         title: 'UpscalerJS Integration Test Webpack Bundler Server',
//       })],
//       output: {
//         path: DIST,
//       },
//       module: {
//         rules: [
//           {
//             test: /\.(png|svg|jpg|jpeg|gif)$/i,
//             type: 'asset/resource',
//           },
//         ],
//       },
//     });
//   }

//   compiler.run((err, stats) => {
//     if (err || stats.hasErrors()) {
//       reject(err || stats.toJson('errors-only').errors.map(e => e.message));
//     } else {
//       resolve();
//     }
//   });
// });

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

