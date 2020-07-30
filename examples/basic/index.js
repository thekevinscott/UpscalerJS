import * as tf from '@tensorflow/tfjs';
import Upscaler from 'upscaler';
const target = document.getElementById('target');
const button = document.getElementById('button');

let upscaler;
button.onclick = () => {
  if (!upscaler) {
    upscaler = new Upscaler({
      model: 'psnr_small',
    });
  }
  const img = new Image();
  img.src = flower.src;
  const pixels = tf.browser.fromPixels(img);
  console.log(pixels.shape);
  upscaler.upscale(pixels).then((upscaledImgSrc) => {
    console.log('back')
    const img = document.createElement('img');
    console.log(upscaledImgSrc)
    img.src = upscaledImgSrc;
    target.appendChild(img);
  });
};
