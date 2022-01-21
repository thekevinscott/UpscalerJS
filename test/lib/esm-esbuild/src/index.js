import * as tfjs from '@tensorflow/tfjs';
import Upscaler from 'upscaler';
import flower from '../../../__fixtures__/flower-small.png';
window.tfjs = tfjs;
window.flower = flower;
window.upscaler = new Upscaler({
  model: '/pixelator/pixelator.json',
  scale: 4,
});
document.title = `${document.title} | Loaded`;
