/*****
 * Fetch images from the Pixabay API
 */

// import path from 'path';
import * as tf from '@tensorflow/tfjs';
// import tensorAsBase64 from 'tensor-as-base64';
import { handleUpscalerJSRequest } from '@upscalerjs/workers.shared'

tf.setBackend('cpu');

/**
 * Types
 */
export interface Env {
  PIXABAY_API_KEY: string;
}

/**
 * Constants
 */
const CACHE_LENGTH = 60 * 60 * 24; // 1 day

export default {
  async fetch(
    request: Request,
    _env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    return handleUpscalerJSRequest(async () => await upscaleImage(request), {
      cacheLength: CACHE_LENGTH,
      request,
      ctx, 
    })
  },
};

const upscale = (buffer: Buffer) => new Promise((resolve, reject) => tf.ready().then(async () => {
  // const t = tf.tensor1d([1, 2, 3]);
  // t.print();
  try {
    // const f = await tf.loadLayersModel('https://cdn.jsdelivr.net/npm/@upscalerjs/pixel-upsampler@0.4.1/models/4x3/4x3.json');
    const t = tf.ones([1, 16, 16, 3]);
    // const upscaledTensor = await f.predict(t);
    // const upscaledSrc = await tensorAsBase64(upscaledTensor);
    // resolve(upscaledSrc);
    const { default: Upscaler } = await import('upscaler');
    const upscaler = new Upscaler({
      model: {
        path: 'https://cdn.jsdelivr.net/npm/@upscalerjs/pixel-upsampler@0.4.1/models/4x3/4x3.json',
        scale: 4,
      }
    });

    console.log('pre')
    const upscaledSrc = await upscaler.upscale(t, {
      output: 'tensor',
    });
    console.log('post')
    resolve(upscaledSrc.dataSync());
  } catch (err) {
    console.error('some error', err);
    reject(err);
  }
}));

const upscaleImage = async (request: Request): Promise<Response> => {
  console.log(request);

  // Display the key/value pairs
  // for (const pair of request.headers.entries()) {
  //   console.log(`${pair[0]}: ${pair[1]}`);
  // }
  const buf = await request.arrayBuffer();
  const t = tf.tensor1d([1,2,3]);
  // t.print();
  // console.log(buf);
  // const upscaledSrc = 'foo';
  const upscaledSrc = await upscale(buf);
  // const upscaledSrc = await upscaler.upscale(buf);
  // let targetname = request.headers.get("x-filename");
  // console.log(targetname)
  //           let buf = await request.arrayBuffer();
  return new Response(JSON.stringify({ upscaledSrc }));
}
