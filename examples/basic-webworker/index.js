import "regenerator-runtime/runtime.js";
import * as tf from '@tensorflow/tfjs';
import Upscaler from 'upscaler';
import img from './flower.png';
const target = document.getElementById('target');
const buttonWithWW = document.getElementById('button-webworker');
const buttonWithoutWW = document.getElementById('button-no-webworker');
const info = document.getElementById('info');

let upscaler;
const worker = new Worker('worker.js');

buttonWithWW.onclick = async () => {
  info.innerText = 'Upscaling...';
  const image = new Image();
  image.src = img;
  const pixels = tf.browser.fromPixels(image);
  await tf.nextFrame();
  worker.postMessage(pixels.dataSync());
};
worker.onmessage = function(e) {
  console.log(e.data);
  info.innerText = 'Upscaled';
}

buttonWithoutWW.onclick = () => {
  info.innerText = 'Upscaling...';
  if (!upscaler) {
    upscaler = new Upscaler({
      model: 'psnr_small',
    });
  }
  upscaler.upscale(img).then((upscaledImgSrc) => {
    const img = document.createElement('img');
    img.src = upscaledImgSrc;
    target.innerHTML = '';
    target.appendChild(img);
    info.innerText = 'Upscaled';
  });
};
