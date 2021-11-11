const fs = require('fs');
const handler = require('serve-handler');
const http = require('http');
const rimraf = require('rimraf');
const path = require('path');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname);
const DIST = path.join(ROOT, '/dist');

const bundle = () => {
  rimraf.sync(DIST);
  const entryFiles = path.join(ROOT, 'src/index.js');
  try {
    esbuild.buildSync({
      entryPoints: [entryFiles],
      bundle: true,
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
// const bundleWebpack = () => new Promise((resolve, reject) => {
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
module.exports.bundle = bundle;

module.exports.startServer = (PORT, callback) => new Promise(async resolve => {
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
