import * as tf from '@tensorflow/tfjs';
import Upscaler from 'upscaler';
import img from './flower.png';
import { writeOutput, disable } from './ui';

const buttonWithWW = document.getElementById('button-webworker');
const buttonWithoutWW = document.getElementById('button-no-webworker');
const worker = new Worker(new URL('./worker.js', import.meta.url), {
  type: 'module'
});

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
  const tensor = tf.tidy(() => tf.tensor(data, shape).div(255));
  const canvas = document.createElement('canvas');
  canvas.height = shape[0];
  canvas.width = shape[1];
  await tf.browser.toPixels(tensor, canvas);
  tensor.dispose();
  writeOutput(canvas.toDataURL());
}

buttonWithoutWW.onclick = async () => {
  const upscaler = new Upscaler();
  await disable();
  upscaler.upscale(img, {
    patchSize: 16,
    padding: 2,
  }).then(writeOutput);
};
