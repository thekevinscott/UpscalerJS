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

  const entryFile = path.join(ROOT, 'src/index.js');
  writeIndex(entryFile, `
import * as tf from '@tensorflow/tfjs';
import ESRGANSlim from '@upscalerjs-for-esbuild/esrgan-slim';
import Upscaler from 'upscaler-for-esbuild';
import pixelUpsampler2x from '@upscalerjs-for-esbuild/pixel-upsampler/2x';
import pixelUpsampler3x from '@upscalerjs-for-esbuild/pixel-upsampler/3x';
import pixelUpsampler4x from '@upscalerjs-for-esbuild/pixel-upsampler/4x';
import ESRGANDiv2K2x from '@upscalerjs-for-esbuild/esrgan-legacy/div2k/2x';
import ESRGANDiv2K3x from '@upscalerjs-for-esbuild/esrgan-legacy/div2k/3x';
import ESRGANDiv2K4x from '@upscalerjs-for-esbuild/esrgan-legacy/div2k/4x';
import ESRGANPSNR from '@upscalerjs-for-esbuild/esrgan-legacy/psnr-small';
import ESRGANGANS from '@upscalerjs-for-esbuild/esrgan-legacy/gans';
import flower from '../../../__fixtures__/flower-small.png';
window.tf = tf;
window.flower = flower;
window.Upscaler = Upscaler;
window['esrgan-slim'] = {
  'index': ESRGANSlim,
};
window['pixel-upsampler'] = {
  '2x': pixelUpsampler2x,
  '3x': pixelUpsampler3x,
  '4x': pixelUpsampler4x,
};
window['esrgan-legacy'] = {
  'div2k/2x': ESRGANDiv2K2x,
  'div2k/3x': ESRGANDiv2K3x,
  'div2k/4x': ESRGANDiv2K4x,
  'psnr-small': ESRGANPSNR,
  'gans': ESRGANGANS,
};
document.title = document.title + ' | Loaded';
document.body.querySelector('#output').innerHTML = document.title;
  `);
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
