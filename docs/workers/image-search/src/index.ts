/*****
 * Fetch images from the Pixabay API
 */

import { handleUpscalerJSRequest } from '@upscalerjs/workers.shared'

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
    { PIXABAY_API_KEY }: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    return handleUpscalerJSRequest(() => fetchFromPixabay(PIXABAY_API_KEY, request), {
      cacheLength: CACHE_LENGTH,
      request,
      ctx, 
    })
  },
};

const fetchFromPixabay = async (PIXABAY_API_KEY: string, request: Request): Promise<Response> => {
  const query = new URL(request.url).searchParams.get('q');
  const url = `https://pixabay.com/api/?key=${PIXABAY_API_KEY}&q=${query}&safesearch=1`;
  return await fetch(url, {
    headers: {
      'content-type': 'application/json;charset=UTF-8',
    },
  });
}
