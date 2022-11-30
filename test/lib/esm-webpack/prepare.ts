import path from 'path';
import rimraf from 'rimraf';
import { copyFixtures } from '../utils/copyFixtures';
import webpack from 'webpack';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import { installLocalPackages, installNodeModules, writeIndex } from '../shared/prepare';
import { LOCAL_UPSCALER_NAME, LOCAL_UPSCALER_NAMESPACE } from './constants';
import { MockCDN } from '../../integration/utils/BrowserTestRunner';
import { getAllAvailableModelPackages, getAllAvailableModels } from '../../../scripts/package-scripts/utils/getAllAvailableModels';
import { MODELS_DIR } from '../../../scripts/package-scripts/utils/constants';

const ROOT = path.join(__dirname);
export const DIST = path.join(ROOT, '/dist');
const UPSCALER_PATH = path.join(ROOT, '../../../packages/upscalerjs')

const PACKAGES = [
  ...getAllAvailableModelPackages().filter((packageName) => {
    return packageName === 'pixel-upsampler';
  }).map(packageName => ({
    packageName,
    models: getAllAvailableModels(packageName).map(({ esm }) => {
      return esm === '' ? {
        path: '',
        name: 'index',
      } : {
        path: esm,
        name: esm,
      };
    }),
  })),
];

export const prepareScriptBundleForESM = async () => {
  await installNodeModules(ROOT);
  await installLocalPackages(ROOT, [
    {
      src: UPSCALER_PATH,
      name: LOCAL_UPSCALER_NAME,
    },
      ...PACKAGES.map(({ packageName }) => ({
        src: path.resolve(MODELS_DIR, packageName),
        name: path.join(LOCAL_UPSCALER_NAMESPACE, packageName),
      })),
  ]);
};

export const bundleWebpack = (): Promise<void> => new Promise(async (resolve, reject) => {
  rimraf.sync(DIST);
  copyFixtures(DIST);

  const entryFile = path.join(ROOT, 'src/index.js');
  await writeIndex(entryFile, LOCAL_UPSCALER_NAME);

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
