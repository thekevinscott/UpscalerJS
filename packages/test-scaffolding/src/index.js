import * as tfjs from '@tensorflow/tfjs';
import Upscaler from 'upscaler';
import flower from './flower.png';
window.tfjs = tfjs;
window.flower = flower;
window.upscaler = new Upscaler();
