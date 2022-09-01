/*****
 * Fetch images from the Pixabay API
 */

import * as tf from '@tensorflow/tfjs';
import { handleUpscalerJSRequest } from '@upscalerjs/workers.shared';
import jpeg from 'jpeg-js';

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

const upscale = async (t: tf.Tensor4D) => {
  await tf.ready();
  const { default: Upscaler } = await import('upscaler');
  const upscaler = new Upscaler({
    model: {
      path: 'https://cdn.jsdelivr.net/npm/@upscalerjs/pixel-upsampler@0.4.1/models/4x3/4x3.json',
      scale: 4,
    }
  });

  const upscaledSrc = await upscaler.upscale(t, {
    output: 'tensor',
  });
  return Array.from(upscaledSrc.dataSync());
};

const convertImage = async (req: Request): Promise<tf.Tensor4D> => {
  const formData = await req.formData();
  const buf = await (formData.get('file') as File).arrayBuffer();
  const rawImageData = jpeg.decode(buf, {useTArray: true});
  return tf.tensor(rawImageData.data, [1, rawImageData.height, rawImageData.width, 4]).slice([0, 0, 0, 0], [-1, -1, -1, 3]) as tf.Tensor4D;
}

const upscaleImage = async (request: Request): Promise<Response> => {
  const img = await convertImage(request);
  const upscaledSrc = await upscale(img);
  return new Response(JSON.stringify({ upscaledSrc }));
}

export default {
  fetch(
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
