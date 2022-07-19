/****
 * Tests that loading models via CDN works
 */
import { bundle, DIST as ESBUILD_DIST } from '../../lib/esm-esbuild/prepare';
import Upscaler, { ModelDefinition } from 'upscaler';
import * as tf from '@tensorflow/tfjs';
import { TestRunner } from '../utils/TestRunner';

// TODO: Figure out how to import this from upscaler
const CDNS = [
  { name: 'jsdelivr', },
  { name: 'unpkg', },
];

// TODO: Figure out how to import this from upscaler
const LOAD_MODEL_ERROR_MESSAGE = (modelPath: string) => `Could not resolve URL ${modelPath}`;

const TRACK_TIME = false;
jest.setTimeout(5 * 1000);
jest.retryTimes(0);

describe('CDN Integration Tests', () => {
  const testRunner = new TestRunner({
    mockCDNs: false,
    dist: ESBUILD_DIST,
    trackTime: TRACK_TIME,
    log: false,
  });
  const page = () => {
    testRunner.page.setRequestInterception(true);
    return testRunner.page;
  }

  beforeAll(async function beforeAll() {
    await testRunner.beforeAll(bundle);
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

  it("loads a model from the default CDN", async () => {
    const _page = page();

    const requests: string[] = [];

    _page.on('request', (request) => {
      requests.push(request.url())
      request.continue();
    });
    await _page.evaluate(() => {
      const upscaler = new window['Upscaler']({
        model: window['pixel-upsampler']['4x'],
      });
      return upscaler.getModel();
    });
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
    await _page.evaluate(() => {
      const upscaler = new window['Upscaler']({
        model: window['pixel-upsampler']['4x'],
      });
      return upscaler.getModel();
    });
    expect(requests).not.toEqual(expect.arrayContaining([expect.stringContaining(CDNS[0].name)]));
    expect(requests).toEqual(expect.arrayContaining([expect.stringContaining(CDNS[1].name)]));
  });

  it("throws an error if no CDNs are available", (done) => {
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
    _page.evaluate(() => {
      const upscaler = new window['Upscaler']({
        model: window['pixel-upsampler']['4x'],
      });
      return upscaler.getModel();
    }).then(() => {
      throw new Error('Should have thrown an error')
    }).catch(err => {
      expect(requests).not.toEqual(expect.arrayContaining([expect.stringContaining(CDNS[0].name)]));
      expect(requests).not.toEqual(expect.arrayContaining([expect.stringContaining(CDNS[1].name)]));
      expect(err.message).toMatch(LOAD_MODEL_ERROR_MESSAGE('models/4x/4x.json'))
      done();
    });
  });
});

declare global {
  interface Window {
    Upscaler: typeof Upscaler;
    flower: string;
    tf: typeof tf;
    'pixel-upsampler': Record<string, ModelDefinition>;
    'esrgan-legacy': Record<string, ModelDefinition>;
    PixelUpsampler2x: ModelDefinition;
  }
}

