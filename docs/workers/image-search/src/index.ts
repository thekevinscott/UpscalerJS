/*****
 * Fetch images from the Pixabay API
 */

export interface Env {
  PIXABAY_API_KEY: string;
}

const ALLOWED_DOMAINS = ['http://localhost:3000', 'https://upscalerjs.com'];

export default {
  async fetch(
    request: Request,
    { PIXABAY_API_KEY }: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const headers = new Headers({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
      'Access-Control-Allow-Headers': '*'
    });

    if (!ALLOWED_DOMAINS.includes(request.headers.get('origin') || '')) {
      return new Response('Not allowed', {
        status: 403,
        headers: headers,
      });
    }

    const url = new URL(request.url);
    const response = await fetchFromPixabay(PIXABAY_API_KEY, url.searchParams.get('q'));

    const results = JSON.stringify(await response.json());
    const status = response.status;
    const statusText = response.statusText;
    headers.set('content-type', 'application/json;charset=UTF-8');
    return new Response(results, {
      headers,
      status,
      statusText,
      cf: {
        // Always cache this fetch regardless of content type
        // for a max of 5 seconds before revalidating the resource
        cacheTtl: 60 * 60 * 24,
        cacheEverything: true,
      },
    })
  },
};

const fetchFromPixabay = async (PIXABAY_API_KEY: string, query: string | null): Promise<Response> => {
  const url = `https://pixabay.com/api/?key=${PIXABAY_API_KEY}&q=${query}`;
  return fetch(url, {
    headers: {
      'content-type': 'application/json;charset=UTF-8',
      'Cache-Control': `s-maxage=${60 * 60 * 24}`,
    },
  });
}
