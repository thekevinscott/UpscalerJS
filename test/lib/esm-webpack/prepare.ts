import path from 'path';
import rimraf from 'rimraf';
import { copyFixtures } from '../utils/copyFixtures';
import webpack from 'webpack';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import { installLocalPackages, installNodeModules } from '../shared/prepare';
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

  const entryFiles = path.join(ROOT, 'src/index.js');

  const compiler = webpack({
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
