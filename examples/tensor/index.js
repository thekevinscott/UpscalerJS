import * as tf from '@tensorflow/tfjs';
import Upscaler from 'upscaler';
const target = document.getElementById('target');
const button = document.getElementById('button');
const info = document.getElementById('info');

let upscaler;
button.onclick = () => {
  info.innerText = 'Upscaling...';
  if (!upscaler) {
    upscaler = new Upscaler({
      model: 'psnr_small',
    });
  }
  const start = new Date().getTime();
  const img = new Image();
  img.src = flower.src;
  const pixels = tf.browser.fromPixels(img);
  upscaler.upscale(pixels, {
    output: 'tensor',
  }).then((upscaledImg) => {
    const data = upscaledImg.dataSync();
    target.innerHTML = JSON.stringify(data);
    const ms = new Date().getTime() - start;
    info.innerText = `Upscaled in ${ms} ms`;
  });
};
