import fs from 'fs';
import path from 'path';
import { buildSync, build } from 'esbuild';
import { copyFixtures } from '../utils/copyFixtures';
import { installLocalPackages, installNodeModules, writeIndex } from '../shared/prepare';
import { LOCAL_UPSCALER_NAME, LOCAL_UPSCALER_NAMESPACE } from './constants';
import { MockCDN } from '../../integration/utils/BrowserTestRunner';

const ROOT = path.join(__dirname);
export const DIST = path.join(ROOT, '/dist');
const UPSCALER_PATH = path.join(ROOT, '../../../packages/upscalerjs')
const MODELS_PATH = path.join(ROOT, '../../../models')

const PACKAGES = [
  'esrgan-slim',
  'pixel-upsampler',
  'esrgan-legacy',
];

const camelCaseName = (name: string) => name.split('-').map((part, i) => {
  if (i > 0) {
    return `${part[0].toUpperCase()}${part.slice(1)}`;
  }
  return part;
}).join('');

export const bundle = async () => {
  await installNodeModules(ROOT);
  await installLocalPackages(ROOT, [
    {
      src: UPSCALER_PATH,
      name: LOCAL_UPSCALER_NAME,
    },
    ...PACKAGES.map(name => ({
      src: path.resolve(MODELS_PATH, name),
      name: path.join(LOCAL_UPSCALER_NAMESPACE, name),
    })),
  ]);
  copyFixtures(DIST, false);

  const entryFile = path.join(ROOT, 'src/index.js');
  await writeIndex(entryFile, LOCAL_UPSCALER_NAME,
    PACKAGES.map(name => ({
      name: camelCaseName(name),
      path: `${LOCAL_UPSCALER_NAMESPACE}/${name}`,
    })), LOCAL_UPSCALER_NAMESPACE);
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
