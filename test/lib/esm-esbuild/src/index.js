import * as tf from '@tensorflow/tfjs';
import Upscaler from 'upscaler-for-esbuild';

/*** Auto-generated import commands ***/
import _fixture_7ea4ea245167d016233e0f3fb874fcbc from '../../../../models/default-model/test/__fixtures__/fixture.png';
import _1c581865a8179a3b5669bb8a8d587b3f from '@upscalerjs-for-esbuild/default-model';
import _fixture_24ce7fb701648587acb433483824af0a from '../../../../models/esrgan-legacy/test/__fixtures__/fixture.png';
import _80b4d559332a39d9ca87cf2765201b72 from '@upscalerjs-for-esbuild/esrgan-legacy/div2k/2x';
import _cb5b22851c3d3d4058c8756f7b0d7d80 from '@upscalerjs-for-esbuild/esrgan-legacy/div2k/3x';
import _7c686c81371cebb1559c72c57dfd4dbc from '@upscalerjs-for-esbuild/esrgan-legacy/div2k/4x';
import _3f6de19903303c06cfa29e149fa57a18 from '@upscalerjs-for-esbuild/esrgan-legacy/psnr-small';
import _8beba3c1f9c60831b04db28194f95ab3 from '@upscalerjs-for-esbuild/esrgan-legacy/gans';
import _fixture_1f43605b11398af2a08074bfc9ecbc2d from '../../../../models/esrgan-medium/test/__fixtures__/fixture.png';
import _169293cfa16afe44bb204540028a4a34 from '@upscalerjs-for-esbuild/esrgan-medium/2x';
import _2db85b2eb55eeb79c372409321df2631 from '@upscalerjs-for-esbuild/esrgan-medium/3x';
import _790049e99056ce5bf9c75ce3d364aa9f from '@upscalerjs-for-esbuild/esrgan-medium/4x';
import _fixture_73b688d04f9cb1bb26e501a4a8a3f367 from '../../../../models/esrgan-slim/test/__fixtures__/fixture.png';
import _6c3a119f34f7b17f2bf0ca72139efff4 from '@upscalerjs-for-esbuild/esrgan-slim/2x';
import _f299e03da294886afc0979abe50b798d from '@upscalerjs-for-esbuild/esrgan-slim/3x';
import _05e3e86f0152176e5399b2ac06656b5c from '@upscalerjs-for-esbuild/esrgan-slim/4x';
import _fixture_26a59ce0f9b2fc8a95e407f88a9268be from '../../../../models/esrgan-thick/test/__fixtures__/fixture.png';
import _a3f01b9078a5c218adb20e11fcf918c8 from '@upscalerjs-for-esbuild/esrgan-thick/2x';
import _563102047298f65e54cf6c8e242bae5b from '@upscalerjs-for-esbuild/esrgan-thick/3x';
import _f4d395680022bd46d174e3cb9816fa06 from '@upscalerjs-for-esbuild/esrgan-thick/4x';
import _76d55dfe04daa9f9e07c3d77f80ab813 from '@upscalerjs-for-esbuild/esrgan-thick/8x';
import _fixture_b4bee5319168da0ebde2491300dda92e from '../../../../models/pixel-upsampler/test/__fixtures__/fixture.png';
import _60346e8c204b8bfd7f6188809d516226 from '@upscalerjs-for-esbuild/pixel-upsampler/x2';
import _445cc288de470ee8f6981131fed29f8f from '@upscalerjs-for-esbuild/pixel-upsampler/x3';
import _cbec8142b30b437ced079f5d2d6ae553 from '@upscalerjs-for-esbuild/pixel-upsampler/x4';

/*** Auto-generated window definition commands ***/
window['default-model'] = {
  'index': _1c581865a8179a3b5669bb8a8d587b3f,
}
window['esrgan-legacy'] = {
  'div2k/2x': _80b4d559332a39d9ca87cf2765201b72,
  'div2k/3x': _cb5b22851c3d3d4058c8756f7b0d7d80,
  'div2k/4x': _7c686c81371cebb1559c72c57dfd4dbc,
  'psnr-small': _3f6de19903303c06cfa29e149fa57a18,
  'gans': _8beba3c1f9c60831b04db28194f95ab3,
}
window['esrgan-medium'] = {
  '2x': _169293cfa16afe44bb204540028a4a34,
  '3x': _2db85b2eb55eeb79c372409321df2631,
  '4x': _790049e99056ce5bf9c75ce3d364aa9f,
}
window['esrgan-slim'] = {
  '2x': _6c3a119f34f7b17f2bf0ca72139efff4,
  '3x': _f299e03da294886afc0979abe50b798d,
  '4x': _05e3e86f0152176e5399b2ac06656b5c,
}
window['esrgan-thick'] = {
  '2x': _a3f01b9078a5c218adb20e11fcf918c8,
  '3x': _563102047298f65e54cf6c8e242bae5b,
  '4x': _f4d395680022bd46d174e3cb9816fa06,
  '8x': _76d55dfe04daa9f9e07c3d77f80ab813,
}
window['pixel-upsampler'] = {
  'x2': _60346e8c204b8bfd7f6188809d516226,
  'x3': _445cc288de470ee8f6981131fed29f8f,
  'x4': _cbec8142b30b437ced079f5d2d6ae553,
}

/*** Auto-generated fixture import commands ***/
window['fixtures'] = {
  'default-model': _fixture_7ea4ea245167d016233e0f3fb874fcbc,
  'esrgan-legacy': _fixture_24ce7fb701648587acb433483824af0a,
  'esrgan-medium': _fixture_1f43605b11398af2a08074bfc9ecbc2d,
  'esrgan-slim': _fixture_73b688d04f9cb1bb26e501a4a8a3f367,
  'esrgan-thick': _fixture_26a59ce0f9b2fc8a95e407f88a9268be,
  'pixel-upsampler': _fixture_b4bee5319168da0ebde2491300dda92e,
}

window.tf = tf;
window.Upscaler = Upscaler;
document.title = document.title + '| Loaded';
document.body.querySelector('#output').innerHTML = document.title;