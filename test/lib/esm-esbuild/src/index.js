import * as tf from '@tensorflow/tfjs';
import Upscaler from 'upscaler-for-esbuild';
import pixelUpsampler from '@upscalerjs/pixel-upsampler/4x-3';
import flower from '../../../__fixtures__/flower-small.png';
window.tf = tf;
window.flower = flower;
window.Upscaler = Upscaler;
window.pixelUpsampler = pixelUpsampler;
document.title = `${document.title} | Loaded`;
document.body.querySelector('#output').innerHTML = `${document.title}`;
