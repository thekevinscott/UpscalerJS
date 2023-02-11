/****
 * Tests that loading models via CDN works
 */
import { ESBUILD_DIST as ESBUILD_DIST } from '../../lib/esm-esbuild/prepare';
import Upscaler, { ModelDefinition } from 'upscaler';
import type tf from '@tensorflow/tfjs';
import { BrowserTestRunner } from '../utils/BrowserTestRunner';
import type puppeteer from 'puppeteer';

// TODO: Figure out how to import this from upscaler
const CDNS = [
  { name: 'jsdelivr', },
  { name: 'unpkg', },
];

// TODO: Figure out how to import this from upscaler
const LOAD_MODEL_ERROR_MESSAGE = (modelPath: string) => `Could not resolve URL ${modelPath}`;

const TRACK_TIME = false;
const VERBOSE = false;
const USE_PNPM = `${process.env.USE_PNPM}` === '1';
jest.setTimeout(20000);
jest.retryTimes(0);

describe('CDN Integration Tests', () => {
  const testRunner = new BrowserTestRunner({
    dist: ESBUILD_DIST,
    trackTime: TRACK_TIME,
    log: false,
    verbose: VERBOSE,
    usePNPM: USE_PNPM,
  });
  const page = () => {
    testRunner.page.setRequestInterception(true);
    return testRunner.page;
  }

  afterAll(async function modelAfterAll() {
    await testRunner.afterAll();
  }, 10000);

  beforeEach(async function beforeEach() {
    await testRunner.beforeEach('| Loaded');
  });

  afterEach(async function afterEach() {
    await testRunner.afterEach();
  });

  const evaluateUpscaler = async (page: puppeteer.Page) => {
    try {
      await page.evaluate(() => {
        const upscaler = new window['Upscaler']({
          model: window['pixel-upsampler']['4x'],
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
    expect(err.message).toMatch(LOAD_MODEL_ERROR_MESSAGE('models/4x/4x.json'))
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

