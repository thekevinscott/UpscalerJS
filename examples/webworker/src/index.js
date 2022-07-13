import * as tf from '@tensorflow/tfjs';
import Upscaler from 'upscaler';
import img from './flower.png';
import { writeOutput, disable } from './ui';
import tensorAsBase64 from 'tensor-as-base64';

const buttonWithWW = document.getElementById('button-webworker');
const buttonWithoutWW = document.getElementById('button-no-webworker');
const worker = new Worker('worker.js');

buttonWithWW.onclick = async () => {
  await disable();
  const image = new Image();
  image.src = img;
  image.crossOrigin = 'anonymous';
  image.onload = async () => {
    const pixels = tf.browser.fromPixels(image);
    await tf.nextFrame();
    const data = await pixels.data();
    worker.postMessage([data, pixels.shape]);
  };
};
worker.onmessage = async (e) => {
  const [ data, shape ] = e.data;
  const tensor = tf.tensor(data, shape);
  const src = await tensorAsBase64(tensor);
  writeOutput(src);
}

buttonWithoutWW.onclick = async () => {
  const upscaler = new Upscaler();
  await disable();
  upscaler.upscale(img, {
    patchSize: 64,
    padding: 4,
  }).then(writeOutput);
};
