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
document.title = `${document.title} | Loaded`;
document.body.querySelector('#output').innerHTML = `${document.title}`;
