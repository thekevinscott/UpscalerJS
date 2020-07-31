import Upscaler from 'upscaler';
import * as tf from '@tensorflow/tfjs';
let upscaler;

const upscaleImage = ([ data, shape ]) => {
  if (!upscaler) {
    upscaler = new Upscaler({
      model: '2x',
    });
  }
  const tensor = tf.tensor(data, shape);
  upscaler
    .upscale(tensor, {
      output: 'tensor',
    })
    .then((upscaledImg) => {
      const shape = upscaledImg.shape;
      const upscaledData = upscaledImg.dataSync();
      postMessage([upscaledData, shape]);
    });
}

onmessage = (e) => {
  upscaleImage(e.data);
}
