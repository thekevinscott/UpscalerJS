import path from 'path';
import rimraf from 'rimraf';
import { copyFixtures } from '../utils/copyFixtures';
import webpack from 'webpack';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import { installLocalPackages, installNodeModules, writeIndex } from '../shared/prepare';
import { LOCAL_UPSCALER_NAME } from './constants';
import { MockCDN } from '../../integration/utils/BrowserTestRunner';

const ROOT = path.join(__dirname);
export const DIST = path.join(ROOT, '/dist');
const UPSCALER_PATH = path.join(ROOT, '../../../packages/upscalerjs')

export const prepareScriptBundleForESM = async () => {
  await installNodeModules(ROOT);
  await installLocalPackages(ROOT, [
    {
      src: UPSCALER_PATH,
      name: LOCAL_UPSCALER_NAME,
    },
  ]);
};

export const bundleWebpack = (): Promise<void> => new Promise(async (resolve, reject) => {
  rimraf.sync(DIST);
  copyFixtures(DIST);

  const entryFile = path.join(ROOT, 'src/index.js');
  writeIndex(entryFile, `
import * as tf from '@tensorflow/tfjs';
import Upscaler from 'upscaler-for-esm-webpack';
import flower from '../../../__fixtures__/flower-small.png';
window.tfjs = tf;
window.flower = flower;
window.Upscaler = Upscaler;
document.title = document.title + ' | Loaded';
document.body.querySelector('#output').innerHTML = document.title;
  `);

  const compiler = webpack({
    mode: 'production',
    context: ROOT,
    entry: entryFile,
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
    if (err || stats?.hasErrors()) {
      reject(err || stats?.toJson('errors-only').errors?.map(e => e.message));
    } else {
      resolve();
    }
  });

  return compiler;
});

export const mockCDN: MockCDN = (port, model, pathToModel) => {
  return [
    `http://localhost:${port}`,
    'node_modules',
    '@upscalerjs',
    model,
    pathToModel,
  ].join('/');
};
