/****
 * Tests that loading models via CDN works
 */
import path from 'path';
import Upscaler, { ModelDefinition } from 'upscaler';
import type tf from '@tensorflow/tfjs';
import type { Page } from 'puppeteer';
import { ClientsideTestRunner } from '@internals/test-runner/clientside';

// TODO: Figure out how to import this from upscaler
const CDNS = [
  { name: 'jsdelivr', },
  { name: 'unpkg', },
];

// TODO: Figure out how to import this from upscaler
const LOAD_MODEL_ERROR_MESSAGE = (modelPath: string) => `Could not resolve URL ${modelPath}`;

const ROOT_BUNDLER_OUTPUT_DIR = process.env.ROOT_BUNDLER_OUTPUT_DIR;
if (typeof ROOT_BUNDLER_OUTPUT_DIR !== 'string') {
  throw new Error('ROOT_BUNDLER_OUTPUT_DIR not defined in env');
}
const ESBUILD_DIST = path.resolve(ROOT_BUNDLER_OUTPUT_DIR, 'esbuild/dist')

describe('CDN Integration Tests', () => {
  const testRunner = new ClientsideTestRunner({
    dist: ESBUILD_DIST,
    log: false,
  });
  const page = (): Page => {
    testRunner.page.setRequestInterception(true);
    return testRunner.page;
  }

  beforeAll(async function beforeAll() {
    await testRunner.beforeAll();
  }, 60000);

  afterAll(async function modelAfterAll() {
    await testRunner.afterAll();
  }, 10000);

  beforeEach(async function beforeEach() {
    await testRunner.beforeEach('| Loaded');
  });

  afterEach(async function afterEach() {
    await testRunner.afterEach();
  });

  const evaluateUpscaler = async (page: Page) => {
    try {
      await page.evaluate(() => {
        const model = window['@upscalerjs/pixel-upsampler/x4'];
        if (!model) {
          throw new Error('Model not found');
        }
        const upscaler = new window['Upscaler']({
          model,
        });
        return upscaler.getModel();
      });
    } catch (err) { 
      return err;
    }
  }

  it("loads a model from the default CDN", async () => {
    const _page = page();

    const requests: string[] = [];

    _page.on('request', (request) => {
      requests.push(request.url())
      request.continue();
    });

    await evaluateUpscaler(_page);

    expect(requests).toEqual(expect.arrayContaining([expect.stringContaining(CDNS[0].name)]));
  });

  it("falls back to the second CDN if the first is not available", async () => {
    const _page = page();

    const requests: string[] = [];

    _page.on('request', (request) => {
      const url = request.url();
      if (url.includes(CDNS[0].name)) {
        request.abort();
      } else {
        requests.push(url)
        request.continue();
      }
    });

    await evaluateUpscaler(_page);

    expect(requests).not.toEqual(expect.arrayContaining([expect.stringContaining(CDNS[0].name)]));
    expect(requests).toEqual(expect.arrayContaining([expect.stringContaining(CDNS[1].name)]));
  });

  it("throws an error if no CDNs are available", async () => {
    const _page = page();

    const requests: string[] = [];

    _page.on('request', (request) => {
      const url = request.url();
      if (url.includes(CDNS[0].name) || url.includes(CDNS[1].name)) {
        request.abort();
      } else {
        requests.push(url)
        request.continue();
      }
    });
    const err = await evaluateUpscaler(_page);
    const isError = (err: unknown): err is Error => err instanceof Error;
    expect(err).toBeTruthy();
    if (!isError(err)) {
      throw new Error('No error returned');
    }
    expect(err.message).toMatch(LOAD_MODEL_ERROR_MESSAGE('models/x4/x4.json'))
    expect(requests).not.toEqual(expect.arrayContaining([expect.stringContaining(CDNS[0].name)]));
    expect(requests).not.toEqual(expect.arrayContaining([expect.stringContaining(CDNS[1].name)]));
  });
});

declare global {
  interface Window {
    Upscaler: typeof Upscaler;
    tf: typeof tf;
    'pixel-upsampler': Record<string, ModelDefinition>;
    'esrgan-legacy': Record<string, ModelDefinition>;
    PixelUpsampler2x: ModelDefinition;
  }
}

