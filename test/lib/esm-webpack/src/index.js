import * as tf from '@tensorflow/tfjs';
import Upscaler from 'upscaler-for-esm-webpack';

/*** Auto-generated import commands ***/
import _fixture_b4bee5319168da0ebde2491300dda92e from '../../../../models/pixel-upsampler/test/__fixtures__/fixture.png';
import _d0f39e750d811678c0e71acad99365e2 from '@upscalerjs-for-esm-webpack/pixel-upsampler/x2';
import _7f260ffad8f2391598fd3df27fc23eba from '@upscalerjs-for-esm-webpack/pixel-upsampler/x3';
import _f6dd382f194d44636194a2209a0d696d from '@upscalerjs-for-esm-webpack/pixel-upsampler/x4';

/*** Auto-generated window definition commands ***/
window['pixel-upsampler'] = {
  'x2': _d0f39e750d811678c0e71acad99365e2,
  'x3': _7f260ffad8f2391598fd3df27fc23eba,
  'x4': _f6dd382f194d44636194a2209a0d696d,
}

/*** Auto-generated fixture import commands ***/
window['fixtures'] = {
  'pixel-upsampler': _fixture_b4bee5319168da0ebde2491300dda92e,
}

window.tf = tf;
window.Upscaler = Upscaler;
document.title = document.title + '| Loaded';
document.body.querySelector('#output').innerHTML = document.title;