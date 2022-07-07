import fs from 'fs';
import path from 'path';
import { buildSync } from 'esbuild';
import { copyFixtures } from '../utils/copyFixtures';
import { installLocalPackages, installNodeModules } from '../shared/prepare';
import { LOCAL_UPSCALER_NAME, LOCAL_UPSCALER_NAMESPACE } from './constants';

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
  try {
    buildSync({
      entryPoints: [entryFiles],
      bundle: true,
      loader: {
        '.png': 'file',
      },
      outdir: DIST,
    });
    fs.copyFileSync(path.join(ROOT, 'src/index.html'), path.join(DIST,'index.html'))
  } catch (err) {
    console.error(err);
  }
}
