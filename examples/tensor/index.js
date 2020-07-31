import * as tf from '@tensorflow/tfjs';
import Upscaler from 'upscaler';
const button = document.getElementById('button');
const info = document.getElementById('info');

const upscaler = new Upscaler({
  model: '2x',
});
button.onclick = () => {
  info.innerText = 'Upscaling...';
  const img = new Image();
  img.src = flower.src;
  const pixels = tf.browser.fromPixels(img);
  upscaler.upscale(pixels, {
    output: 'tensor',
  }).then((upscaledImg) => {
    upscaledImg.print();
    info.innerText = 'Open your console to see the tensor.';
  });
};
