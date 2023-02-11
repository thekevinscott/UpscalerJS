import path from 'path';
import rimraf from 'rimraf';
import { copyFixtures } from '../utils/copyFixtures';
import webpack, { Configuration, WebpackPluginInstance } from 'webpack';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import { Import, installLocalPackages, installNodeModules, writeIndex } from '../shared/prepare';
import { LOCAL_UPSCALER_NAME, LOCAL_UPSCALER_NAMESPACE } from './constants';
import { MockCDN } from '../../integration/utils/BrowserTestRunner';
import { getAllAvailableModelPackages, getAllAvailableModels } from '../../../scripts/package-scripts/utils/getAllAvailableModels';
import { MODELS_DIR } from '../../../scripts/package-scripts/utils/constants';
import { Bundle } from '../../integration/utils/NodeTestRunner';

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

export const prepareScriptBundleForESM: Bundle = async ({ verbose = false } = {}) => {
  await installNodeModules(ROOT, { verbose });
  await installLocalPackages(ROOT, [
    {
      src: UPSCALER_PATH,
      name: LOCAL_UPSCALER_NAME,
    },
      ...PACKAGES.map(({ packageName }) => ({
        src: path.resolve(MODELS_DIR, packageName),
        name: path.join(LOCAL_UPSCALER_NAMESPACE, packageName),
      })),
  ], { verbose});
};

const indexImports: Import[] = PACKAGES.reduce((arr, { packageName, models }) => arr.concat({
  packageName,
  paths: models.map(({ name, path }) => ({
    name,
    path: [LOCAL_UPSCALER_NAMESPACE, packageName, name === 'index' ? '' : '', path].filter(Boolean).join('/'),
  })),
}), [] as Import[]);

export const bundleWebpack = ({ verbose = false }: { verbose?: boolean } = {}): Promise<void> => new Promise(async (resolve, reject) => {
  rimraf.sync(DIST);
  copyFixtures(DIST, {
    includeModels: true,
    verbose,
  });

  const entryFile = path.join(ROOT, 'src/index.js');
  await writeIndex(entryFile, LOCAL_UPSCALER_NAME, indexImports);
  if (verbose) {
    console.log('Wrote index file for webpack');
  }

  const htmlWebpackPlugin: WebpackPluginInstance = new HtmlWebpackPlugin({
    title: 'UpscalerJS Integration Test: ESM via Webpack',
    template: path.resolve(__dirname, './src/index.html'),
  });

  const config: Configuration = {
    mode: 'production',
    context: ROOT,
    entry: entryFile,
    stats: 'errors-only',
    plugins: [htmlWebpackPlugin],
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
  }

  const compiler = webpack(config);

  if (verbose) {
    console.log('Running webpack compiler');
  }
  compiler.run((err, stats) => {
    if (err || stats?.hasErrors()) {
      reject(err || stats?.toJson('errors-only').errors?.map(e => e.message));
    } else {
      if (verbose) {
        console.log('Webpack compiler complete');
      }
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
