import * as tfjs from '@tensorflow/tfjs';
import Upscaler from 'upscalerjs';
const flower = document.getElementById('flower');
const root = document.getElementById('root');
const upscaler = new Upscaler({
  model: '2x',
});
root.innerHTML = 'fooey';
