import * as tf from '@tensorflow/tfjs';
import Upscaler from 'upscaler-for-esm-webpack';
import flower from '../../../__fixtures__/flower-small.png';
window.tfjs = tf;
window.flower = flower;
window.Upscaler = Upscaler;
document.title = `${document.title} | Loaded`;
document.body.querySelector('#output').innerHTML = `${document.title}`;
