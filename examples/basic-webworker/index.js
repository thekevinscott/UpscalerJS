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

const writeOutput = (src) => {
  const img = document.createElement('img');
  img.src = src;
  target.innerHTML = '';
  target.appendChild(img);
  info.innerText = 'Upscaled';
}

const disable = () => {
  buttonWithWW.disable = true;
  buttonWithoutWW.disable = true;
};
const enable = () => {
  buttonWithWW.disable = false;
  buttonWithoutWW.disable = false;
};

buttonWithWW.onclick = async () => {
  disable();
  info.innerText = 'Upscaling...';
  const image = new Image();
  image.src = img;
  const pixels = tf.browser.fromPixels(image);
  await tf.nextFrame();
  const data = await pixels.data();
  worker.postMessage([
    data,
    pixels.shape,
  ]);
  enable();
};
worker.onmessage = async (e) => {
  const [ data, shape ] = e.data;
  const tensor = tf.tensor(data, shape);
  const src = await tensorAsBase64(tensor);
  writeOutput(src);
}

buttonWithoutWW.onclick = () => {
  disable();
  info.innerText = 'Upscaling...';
  if (!upscaler) {
    upscaler = new Upscaler({
      model: 'psnr_small',
    });
  }
  upscaler.upscale(img).then(writeOutput);
  enable();
};

export const tensorAsBase64 = async (tensor) => {
  const imageData = await tensorAsImageData(tensor);
  const canvas = document.createElement('canvas');
  canvas.width = tensor.shape[1];
  canvas.height = tensor.shape[0];
  const ctx = canvas.getContext('2d');
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL();
};

export const tensorAsImageData = async (tensor) => {
  const [height, width] = tensor.shape;
  const buffer = new Uint8ClampedArray(width * height * 4);
  const imageData = new ImageData(width, height);
  const data = await tensor.data();
  let i = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pos = (y * width + x) * 4; // position in buffer based on x and y
      buffer[pos] = data[i]; // some R value [0, 255]
      buffer[pos + 1] = data[i + 1]; // some G value
      buffer[pos + 2] = data[i + 2]; // some B value
      buffer[pos + 3] = 255; // set alpha channel
      i += 3;
    }
  }
  imageData.data.set(buffer);
  return imageData;
};
