import Upscaler from 'upscaler';
import * as tf from '@tensorflow/tfjs';

const upscaleImage = async ([ data, shape ]) => {
  const upscaler = new Upscaler({
    model: '2x',
  });
  console.log(data, shape);
  const tensor = tf.tensor(data, shape);
  tensor.print();
  const upscaledImg = await upscaler.upscale(tensor, {
    output: 'tensor',
  });
  const upscaledShape = upscaledImg.shape;
  const upscaledData = await upscaledImg.data();
  postMessage([upscaledData, upscaledShape]);
}

onmessage = (e) => {
  upscaleImage(e.data);
}
