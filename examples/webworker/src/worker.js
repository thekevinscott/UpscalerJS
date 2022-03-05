import Upscaler from 'upscaler';
import * as tf from '@tensorflow/tfjs';

const upscaleImage = async ([ data, shape ]) => {
  const upscaler = new Upscaler({
    model: 'div2k/rdn-C3-D10-G64-G064-x2',
  });
  const tensor = tf.tensor(data, shape);
  const upscaledImg = await upscaler.upscale(tensor, {
    output: 'tensor',
    patchSize: 64,
    padding: 4,
  });
  const upscaledShape = upscaledImg.shape;
  const upscaledData = await upscaledImg.data();
  postMessage([upscaledData, upscaledShape]);
}

onmessage = (e) => {
  upscaleImage(e.data);
}
