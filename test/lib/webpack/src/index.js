import * as tfjs from '@tensorflow/tfjs';
import Upscaler from 'upscaler';
import flower from './flower-small.png';
window.tfjs = tfjs;
window.flower = flower;
window.Upscaler = Upscaler;
document.body.innerHTML = 'Page has been loaded.'
