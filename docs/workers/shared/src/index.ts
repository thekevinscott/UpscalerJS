/**
 * Types
 */
type Callback = () => Promise<Response>;
type GetResponse = () => Promise<Response>;

/**
 * Constants
 */
const ALLOWED_DOMAINS = [
  'http://localhost:3000', 
  'https://upscalerjs.com', 
  'http://image-search.upscalerjs.com',
  'https://image-search.upscalerjs.com',
  'https://image-search-dev.upscaler.workers.dev',
  'https://image-search-prod.upscaler.workers.dev',
];

/**
 * Utility functions
 */
const getHeaders = (cacheLength: number) => new Headers({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Max-Age': '86400',
  'content-type': 'application/json;charset=UTF-8',
  "Cache-Control": `s-maxage=${cacheLength}`,
});

const prepareResponse = async (response: Response, headers: Headers) => {
  const text = await response.text();
  try {
    const json = JSON.parse(text); // ensure it is valid json
    const results = JSON.stringify({
      time: Date.now(),
      response: json,
    });
    const status = response.status;
    const statusText = response.statusText;
    return new Response(results, {
      headers,
      status,
      statusText,
    });
  } catch (err) {
    console.error('Error parsing JSON', text);
    return new Response(JSON.stringify({ text }), {
      headers,
      status: 500,
    });
  }
}

/**
 * Server wrapper functions
 */
const wrapCache = async (request: Request, ctx: ExecutionContext, getResponse: GetResponse, headers: Headers) => {
  const cacheUrl = new URL(request.url);

  // Construct the cache key from the cache URL
  const cacheKey = new Request(cacheUrl.toString(), request);
  const cache = caches.default;

  // Check whether the value is already available in the cache
  // if not, you will need to fetch it from origin, and store it in the cache
  // for future access
  let response = await cache.match(cacheKey);

  if (!response) {
    response = await prepareResponse(await getResponse(), headers);

    // Cache API respects Cache-Control headers. Setting s-max-age to 10
    // will limit the response to be in cache for 10 seconds max

    // Any changes made to the response here will be reflected in the cached value
    const cacheLength = headers.get('cache-length');
    if (cacheLength !== null) {
      response.headers.append("Cache-Control", `s-maxage=${cacheLength}`)
    }

    // Store the fetched response as cacheKey
    // Use waitUntil so you can return the response without blocking on
    // writing to cache
    // ctx.waitUntil(cache.put(cacheKey, response.clone()));
  }
  return response;
}

type HandleUpscalerJSRequest = (callback: Callback, opts: {
  request: Request;
  ctx: ExecutionContext;
  cacheLength: number;
}) => Promise<Response>;
export const handleUpscalerJSRequest: HandleUpscalerJSRequest = async (callback, { //skipcq: JS-0116
  cacheLength,
  request,
  ctx,
}) => {
  const url = new URL(request.url);

  if (url.protocol === 'http:') {
    url.protocol = 'https:';
    return Response.redirect(url.toString(), 301);
  }

  const headers = getHeaders(cacheLength)
  const origin = request.headers.get('origin') || '';
  try {
    if (!ALLOWED_DOMAINS.includes(origin)) {
      console.log(`Should 403, because origin is not in allowed domains. Origin is "${origin}" and ALLOWED_DOMAINS include`, ALLOWED_DOMAINS)
      return new Response(JSON.stringify({ error: 'Not allowed', origin }), {
        status: 403,
        headers,
      });
    } else {
      console.log(`This request is valid, because origin is "${origin}" which is in ALLOWED_DOMAINS`);
    }

    return wrapCache(request, ctx, callback, headers);
  } catch (err) {
    console.error('Error', err);
    return new Response(JSON.stringify({ error: (<Error>err).message }), {
      status: 500,
        headers,
    });
  }
}
