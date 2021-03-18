const HtmlWebpackPlugin = require("html-webpack-plugin");
const webpack = require('webpack');
const handler = require('serve-handler');
const http = require('http');
const rimraf = require('rimraf');
const path = require('path');

const ROOT = path.join(__dirname);
const DIST = path.join(ROOT, '/dist');

let compiler = undefined;
const bundle = () => new Promise((resolve, reject) => {
  rimraf.sync(DIST);

  if (compiler === undefined) {
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
  }

  compiler.run((err, stats) => {
    if (err || stats.hasErrors()) {
      reject(err || stats.toJson('errors-only').errors.map(e => e.message));
    } else {
      resolve();
    }
  });
});

module.exports.startServer = (PORT, callback) => new Promise(async resolve => {
  await bundle();
  const server = http.createServer((request, response) => handler(request, response, {
    public: DIST,
  }));
  server.listen(PORT, () => {
    if (callback) { callback(); }
    resolve(server);
  });
})
