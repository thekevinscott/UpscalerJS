import fs from 'fs';
import path from 'path';
import { buildSync, build } from 'esbuild';
import { copyFixtures } from '../utils/copyFixtures';
import { installLocalPackages, installNodeModules } from '../shared/prepare';
import { LOCAL_UPSCALER_NAME, LOCAL_UPSCALER_NAMESPACE } from './constants';
import { MockCDN } from '../../integration/utils/BrowserTestRunner';

const ROOT = path.join(__dirname);
export const DIST = path.join(ROOT, '/dist');
const UPSCALER_PATH = path.join(ROOT, '../../../packages/upscalerjs')
const MODELS_PATH = path.join(ROOT, '../../../models')

export const bundle = async () => {
  await installNodeModules(ROOT);
  await installLocalPackages(ROOT, [
    {
      src: UPSCALER_PATH,
      name: LOCAL_UPSCALER_NAME,
    },
    {
      src: path.resolve(MODELS_PATH, 'esrgan-slim'),
      name: path.join(LOCAL_UPSCALER_NAMESPACE, 'esrgan-slim'),
    },
    {
      src: path.resolve(MODELS_PATH, 'esrgan-legacy'),
      name: path.join(LOCAL_UPSCALER_NAMESPACE, 'esrgan-legacy'),
    },
    {
      src: path.resolve(MODELS_PATH, 'pixel-upsampler'),
      name: path.join(LOCAL_UPSCALER_NAMESPACE, 'pixel-upsampler'),
    },
  ]);
  copyFixtures(DIST, false);

  const entryFiles = path.join(ROOT, 'src/index.js');
  const buildResult = await build({
    entryPoints: [entryFiles],
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
