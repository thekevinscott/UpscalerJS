/*****
 * Fetch images from the Pixabay API
 */

import * as tf from '@tensorflow/tfjs';
import Upscaler from 'upscaler';
import model from '@upscalerjs/esrgan-slim/4x';

const upscale = async (input) => {
  await tf.ready();
  
  setTimeout(() => {
    throw new Error('Waited 29.9s to load, some error. Explicitly thrown for visibility. Free tier wall time is 30s');
  }, (1000 * 30) - 100);

  console.log('Instantiating upscaler...');
  const upscaler = new Upscaler({
    model,
  });
  await upscaler.getModel(); // if there's an error loading the model, surface it

  console.log('Instantiated upscaler successfully');
  const upscaledSrc = await upscaler.upscale(input, {
    output: 'tensor',
  });

  console.log('Got upscaled response');
  const response = {
    data: Array.from(upscaledSrc.dataSync()),
    shape: upscaledSrc.shape,
  };
  upscaledSrc.dispose();
  return response;
};

async function handleRequest(request) {
  const responseHeaders = new Headers();
  responseHeaders.set('content-type', 'application/json;charset=UTF-8');
  responseHeaders.set('Access-Control-Allow-Origin', '*')
  const init = {
    headers: responseHeaders,
  };
  try {
    const { data, shape } = await request.json();
    console.log('Received request with shape', shape);
    const tensor = tf.tensor(data, shape);
    console.log('Built tensor');
    const response = await upscale(tensor);
    console.log('Upscaled image');
    tensor.dispose();
    return new Response(JSON.stringify(response), init);
  } catch (err) {
    console.error('The upscale function threw an error');
    console.error(err.message);
    return new Response(JSON.stringify({ err: err.message }), init);
  }
}

addEventListener('fetch', event => {
  return event.respondWith(handleRequest(event.request));
});
