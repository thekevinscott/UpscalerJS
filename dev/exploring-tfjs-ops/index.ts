import small from './small.png'
import * as tf from '@tensorflow/tfjs';
import { tensor } from '@tensorflow/tfjs';
window.tf = tf;

const makeImg = (path: string, width?: number, height?: number) => new Promise<HTMLImageElement>(resolve => {
  const img = document.createElement('img');
  img.src = path;
  img.onload = () => {
    img.style.width =  `${width || img.width}px`;
    img.style.height = `${height || img.height}px`;
    resolve(img);
  };
});

const showImg = async (path: string, width?: number, height?: number) => {
  const img = await makeImg(path, width, height);
  document.body.append(img);
  return img;
}

const tensorToImg = async (tensor: tf.Tensor3D) => {
  const canvas = document.createElement('canvas');
  canvas.width = tensor.shape[1];
  canvas.height = tensor.shape[0];
  await tf.browser.toPixels(tensor, canvas);
  return canvas.toDataURL();
};

(async () => {
  const img = await showImg(small);
  const pixels = tf.browser.fromPixels(img);
  const [height, width] = tf.tensor([40, 40]).cast('int32').dataSync();
  const [scaleY, scaleX] = tf.tensor([1.5, 1.5]).cast('float32').dataSync();
  const [x, y] = tf.tensor([10.0, 10.0]).cast('float32').dataSync();
  // first, scale it
  const scaled = tf.image.resizeBilinear(pixels, [pixels.shape[0] * scaleY, pixels.shape[1] * scaleX]);
  // then, pad it
  // let's assume padding is always positive
  const padded = tf.pad3d(scaled, [[y, 0], [x, 0], [0, 0]]);
  // then, crop it
  const cropped = padded.slice([0, 0, 0], [height, width, 3]);
  cropped.print();
  const url = await tensorToImg(cropped.cast('int32'));
  console.log(url);
  showImg(url, width, height);
})();
