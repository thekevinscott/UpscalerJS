import * as tfjs from '@tensorflow/tfjs';
import Upscaler from 'upscaler';
import flower from '../../../__fixtures__/flower-small.png';
window.tfjs = tfjs;
window.flower = flower;
window.Upscaler = Upscaler;
document.title = `${document.title} | Loaded`;
