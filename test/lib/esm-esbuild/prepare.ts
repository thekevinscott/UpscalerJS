import fs from 'fs';
import path from 'path';
import { build } from 'esbuild';
import { copyFixtures } from '../utils/copyFixtures';
import { Import, installLocalPackages, installNodeModules, writeIndex } from '../shared/prepare';
import { LOCAL_UPSCALER_NAME, LOCAL_UPSCALER_NAMESPACE } from './constants';
import { MockCDN } from '../../integration/utils/BrowserTestRunner';
import { getAllAvailableModelPackages, getAllAvailableModels } from '../../../scripts/package-scripts/utils/getAllAvailableModels';

const ROOT = path.join(__dirname);
export const DIST = path.join(ROOT, '/dist');
const UPSCALER_PATH = path.join(ROOT, '../../../packages/upscalerjs')
const MODELS_PATH = path.join(ROOT, '../../../models')

const PACKAGES = [
  ...getAllAvailableModelPackages().map(packageName => ({
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

const indexImports: Import[] = PACKAGES.reduce((arr, { packageName, models }) => arr.concat({
  packageName,
  paths: models.map(({ name, path }) => ({
    name,
    path: [LOCAL_UPSCALER_NAMESPACE, packageName, name === 'index' ? '' : '', path].filter(Boolean).join('/'),
  })),
}), [] as Import[]);

interface BundleOpts {
  verbose?: boolean;
  skipInstallNodeModules?: boolean;
  skipInstallLocalPackages?: boolean;
  skipCopyFixtures?: boolean;
}

export const bundle = async ({ 
  verbose = false, 
  skipInstallNodeModules = false, 
  skipInstallLocalPackages = false,
  skipCopyFixtures = false,
}: BundleOpts = {}) => {
  const entryFile = path.join(ROOT, 'src/index.js');
  writeIndex(entryFile, LOCAL_UPSCALER_NAME, indexImports);
  if (skipInstallLocalPackages !== true) {
    if (verbose) {
      console.log('installing node modules');
    }
    await installNodeModules(ROOT);
  }
  if (skipInstallNodeModules !== true) {
    if (verbose) {
      console.log('installing local packages');
    }
    await installLocalPackages(ROOT, [
      {
        src: UPSCALER_PATH,
        name: LOCAL_UPSCALER_NAME,
      },
      ...PACKAGES.map(({ packageName }) => ({
        src: path.resolve(MODELS_PATH, packageName),
        name: path.join(LOCAL_UPSCALER_NAMESPACE, packageName),
      })),
    ]);
  }
  if (skipCopyFixtures !== true) {
    if (verbose) {
      console.log('copying local fixtures');
    }
    copyFixtures(DIST, false);
  }

  if (verbose) {
    console.log('bundle');
  }
  const buildResult = await build({
    entryPoints: [entryFile],
    bundle: true,
    loader: {
      '.png': 'file',
    },
    outdir: DIST,
    // watch: {
    //   onRebuild(error, result) {
    //     if (error) {
    //       console.error('watch build failed:', error);
    //     } else {
    //       console.log('watch build succeeded:', result);
    //     }
    //   },
    // },
  });
  // buildResult.stop();
  fs.copyFileSync(path.join(ROOT, 'src/index.html'), path.join(DIST, 'index.html'))
  try {
    fs.symlinkSync(path.resolve(ROOT, 'node_modules'), path.join(DIST, 'node_modules'));
  } catch(err) {}
};

export const mockCDN: MockCDN = (port, model, pathToModel) => {
  return [
    `http://localhost:${port}`,
    'node_modules',
    LOCAL_UPSCALER_NAMESPACE,
    model,
    pathToModel,
  ].join('/');
};
