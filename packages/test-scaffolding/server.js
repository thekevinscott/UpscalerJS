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
  console.log('bundle 1')
  rimraf.sync(DIST);

  console.log('bundle 2')
  if (compiler === undefined) {
    console.log('bundle 3')
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

  console.log('bundle 4')
  compiler.run((err, stats) => {
    console.log('bundle 5')
    if (err || stats.hasErrors()) {
      reject(err || stats.toJson('errors-only').errors.map(e => e.message));
    } else {
      resolve();
    }
  });
});

module.exports.startServer = (PORT, callback) => new Promise(async resolve => {
  console.log('starting server 1')
  console.log(bundle);
  try {
    await bundle();
    console.log('starting server 2')
    const server = http.createServer((request, response) => handler(request, response, {
      public: DIST,
    }));
    console.log('starting server 3')
    server.listen(PORT, () => {
      console.log('starting server 4')
      if (callback) { callback(); }
      resolve(server);
    });
  } catch (err) {
    console.error(err);
    throw err;
  }
});
