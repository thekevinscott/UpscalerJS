import * as path from 'path';
import * as rimraf from 'rimraf';
import * as fs from 'fs';
import callExec from '../utils/callExec';
// import { getTFJSVersion } from '../utils/getTFJSVersion';
import { copyFixtures } from '../utils/copyFixtures';
import { updateTFJSVersion } from '../utils/updateTFJSVersion';
import webpack from 'webpack';
import HtmlWebpackPlugin from 'html-webpack-plugin';

const ROOT = path.join(__dirname);
export const DIST = path.join(ROOT, '/dist');
const NODE_MODULES = path.join(ROOT, '/node_modules');

const UPSCALER_PATH = path.join(ROOT, '../../../packages/upscalerjs')
let compiler = undefined;

const moveUpscalerToLocallyNamedPackage = async (localNameForPackage: string) => {
  // Make sure we load the version local to node_modules, _not_ the local version on disk,
  // so we can ensure the build process is accurate and working correctly
  await callExec(`mv ${NODE_MODULES}/upscalerjs ${NODE_MODULES}/${localNameForPackage}`, {
    cwd: UPSCALER_PATH,
  });
  const packageJSON = JSON.parse(fs.readFileSync(`${NODE_MODULES}/${localNameForPackage}/package.json`, 'utf-8'));
  packageJSON.name = localNameForPackage;
  fs.writeFileSync(`${NODE_MODULES}/${localNameForPackage}/package.json`, JSON.stringify(packageJSON));
}

export const prepareScriptBundleForESM = async () => {
  rimraf.sync(`${NODE_MODULES}/upscalerjs`);

  await callExec(`cp -r ${UPSCALER_PATH} ${NODE_MODULES}`, {
    cwd: UPSCALER_PATH,
  });

  await moveUpscalerToLocallyNamedPackage('upscaler-for-webpack');
};

export const bundleWebpack = () => new Promise(async (resolve, reject) => {
  await updateTFJSVersion(ROOT);
  rimraf.sync(DIST);
  copyFixtures(DIST);

  const entryFiles = path.join(ROOT, 'src/index.js');

  compiler = webpack({
    mode: 'production',
    context: ROOT,
    entry: entryFiles,
    stats: 'errors-only',
    plugins: [new HtmlWebpackPlugin({
      title: 'UpscalerJS Integration Test: ESM via Webpack',
      template: path.resolve(__dirname, './src/index.html'),
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
