/*****
 * Fetch images from the Pixabay API
 */

import * as tf from '@tensorflow/tfjs';
import Upscaler from 'upscaler';

tf.setBackend('cpu');

const upscale = async (input) => {
  await tf.ready();
  const upscaler = new Upscaler({
    model: {
      path: 'https://cdn.jsdelivr.net/npm/@upscalerjs/pixel-upsampler@0.4.1/models/4x3/4x3.json',
      scale: 4,
    }
  });

  const upscaledSrc = await upscaler.upscale(input, {
    output: 'tensor',
  });
  const response = {
    data: Array.from(upscaledSrc.dataSync()),
    shape: upscaledSrc.shape,
  };
  upscaledSrc.dispose();
  return response;
};

async function handleRequest(request) {
  const init = {
    headers: {
      'content-type': 'application/json;charset=UTF-8',
    },
  };
  try {
    const {data, shape} = await request.json();
    const tensor = tf.tensor(data, shape);
    const response = await upscale(tensor);
    tensor.dispose();
    return new Response(JSON.stringify(response), init);
  } catch (err) {
    return new Response(JSON.stringify({ err: err.message }), init);
  }
}

addEventListener('fetch', event => {
  return event.respondWith(handleRequest(event.request));
});
