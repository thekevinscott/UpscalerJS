import Upscaler from 'upscaler';
import * as tf from '@tensorflow/tfjs';
import flower from './flower-small.png';

const main = async () => {

  const upscaler = new Upscaler();
  for (const [output, progressOutput] of [
    // [undefined, undefined],
    // ['base64', undefined],
    // ['tensor', 'base64'],
    // ['base64', 'tensor'],
  ]) {
    await upscaler.upscale(flower, {
      patchSize: 2,
      padding: 2,
      output,
      progressOutput,
    });
    console.log('Success, in UI thread, for', output, progressOutput);
  }

  const worker = new Worker(new URL('./worker.ts', import.meta.url), {
    type: 'module'
  });

  const image = new Image();
  image.src = flower;
  image.crossOrigin = 'anonymous';
  image.onload = async () => {
    const pixels = tf.browser.fromPixels(image);
    await tf.nextFrame();
    const data = await pixels.data();
    worker.postMessage([data, pixels.shape]);
  };
};

main();
