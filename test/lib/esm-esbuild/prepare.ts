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

const packages = getAllAvailableModelPackages();

const PACKAGES = [
  ...packages.map(packageName => ({
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
  // { packageName: 'esrgan-slim', models: [
  //   { path: '', name: 'index',},
  // ]},
  // { packageName: 'pixel-upsampler', models: [
  //   { path: '2x', name: '2x',},
  //   { path: '3x', name: '3x',},
  //   { path: '4x', name: '4x',},
  // ]},
  // { packageName: 'esrgan-legacy', models: [
  //   { path: 'div2k/2x', name: 'div2k/2x',},
  //   { path: 'div2k/3x', name: 'div2k/3x',},
  //   { path: 'div2k/4x', name: 'div2k/4x',},
  //   { path: 'psnr-small', name: 'psnr-small',},
  //   { path: 'gans', name: 'gans', },
  // ]},
];

const indexImports: Import[] = PACKAGES.reduce((arr, { packageName, models }) => arr.concat({
  packageName,
  paths: models.map(({ name, path }) => ({
    name,
    path: [LOCAL_UPSCALER_NAMESPACE, packageName, name === 'index' ? '' : '', path].filter(Boolean).join('/'),
  })),
}), [] as Import[]);

export const bundle = async () => {
  const entryFile = path.join(ROOT, 'src/index.js');
  writeIndex(entryFile, LOCAL_UPSCALER_NAME, indexImports);
  await installNodeModules(ROOT);
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
  copyFixtures(DIST, false);

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
