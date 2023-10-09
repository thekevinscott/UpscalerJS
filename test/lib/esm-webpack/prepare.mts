import path from 'path';
import { sync as rimraf } from 'rimraf';
import { copyFixtures } from '../utils/copyFixtures.mjs';
import webpack, { Configuration, WebpackPluginInstance } from 'webpack';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import { Import, installLocalPackages, installNodeModules, writeIndex } from '../shared/prepare.mjs';
import { LOCAL_UPSCALER_NAME, LOCAL_UPSCALER_NAMESPACE } from './constants.mjs';
import { MockCDN } from '../../integration/utils/BrowserTestRunner.mjs';
import { getAllAvailableModelPackages, getAllAvailableModels } from '../../../scripts/package-scripts/utils/getAllAvailableModels.mjs';
import { MODELS_DIR } from '@internals/common/constants';
import { Bundle } from '../../integration/utils/NodeTestRunner.mjs';
import { ROOT_DIR, UPSCALER_DIR } from '@internals/common/constants';
import * as url from 'url';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

export const DIST = path.join(ROOT_DIR, '/dist');

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
  await installNodeModules(ROOT_DIR, { verbose });
  await installLocalPackages(ROOT_DIR, [
    {
      src: UPSCALER_DIR,
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
  rimraf(DIST);
  copyFixtures(DIST, {
    includeModels: true,
    verbose,
  });

  const entryFile = path.join(ROOT_DIR, 'src/index.js');
  await writeIndex(entryFile, LOCAL_UPSCALER_NAME, indexImports);
  if (verbose) {
    console.log('Wrote index file for webpack');
  }

  // TODO: Fix conflicting types here
  const htmlWebpackPlugin: WebpackPluginInstance = new HtmlWebpackPlugin({
    title: 'UpscalerJS Integration Test: ESM via Webpack',
    template: path.resolve(__dirname, './src/index.html'),
  }) as any as WebpackPluginInstance;

  const config: Configuration = {
    mode: 'production',
    context: ROOT_DIR,
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
