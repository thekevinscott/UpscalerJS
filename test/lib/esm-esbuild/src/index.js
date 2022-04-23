import * as tf from '@tensorflow/tfjs';
import Upscaler from 'upscaler-for-esbuild';
import pixelUpsampler2x3 from '@upscalerjs/pixel-upsampler/2x-3';
import pixelUpsampler3x3 from '@upscalerjs/pixel-upsampler/3x-3';
import pixelUpsampler4x3 from '@upscalerjs/pixel-upsampler/4x-3';
import flower from '../../../__fixtures__/flower-small.png';
window.tf = tf;
window.flower = flower;
window.Upscaler = Upscaler;
window['pixel-upsampler'] = {
  '2x-3': pixelUpsampler2x3,
  '3x-3': pixelUpsampler3x3,
  '4x-3': pixelUpsampler4x3,
};
window.pixelUpsampler4x3 = pixelUpsampler4x3;
document.title = `${document.title} | Loaded`;
document.body.querySelector('#output').innerHTML = `${document.title}`;
