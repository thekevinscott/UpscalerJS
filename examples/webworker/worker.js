import Upscaler from 'upscaler';
import * as tf from '@tensorflow/tfjs';

const upscaleImage = async ([ data, shape ]) => {
  const upscaler = new Upscaler();
  const tensor = tf.tensor(data, shape);
  const upscaledImg = await upscaler.upscale(tensor, {
    output: 'tensor',
    patchSize: 16,
    padding: 2,
  });
  const upscaledShape = upscaledImg.shape;
  const upscaledData = await upscaledImg.data();
  postMessage([upscaledData, upscaledShape]);
}

onmessage = (e) => {
  upscaleImage(e.data);
}
