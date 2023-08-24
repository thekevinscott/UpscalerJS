/** 
 * Tests that loading models via CDN works
 */
import Upscaler, { ModelPackage } from 'upscaler';
import type { HTTPRequest, Page } from 'puppeteer';
import { ClientsideTestRunner } from '@internals/test-runner/clientside';
import path from 'path';
import { MODELS_DIR } from '@internals/common/constants';

// TODO: Figure out how to import this from upscaler
const CDNS = [
  'jsdelivr',
  'unpkg',
];
export const CDN_PATH_DEFINITIONS = {
  'jsdelivr': (packageName: string, version: string, path: string) => `https://cdn.jsdelivr.net/npm/${packageName}@${version}/${path}`,
  'unpkg': (packageName: string, version: string, path: string) => `https://unpkg.com/${packageName}@${version}/${path}`,
};

// TODO: Figure out how to import this from upscaler
const LOAD_MODEL_ERROR_MESSAGE = (modelPath: string) => `Could not resolve URL ${modelPath}`;

const TRACK_TIME = true;

const ROOT_BUNDLER_OUTPUT_DIR = process.env.ROOT_BUNDLER_OUTPUT_DIR;
if (typeof ROOT_BUNDLER_OUTPUT_DIR !== 'string') {
  throw new Error('ROOT_BUNDLER_OUTPUT_DIR not defined in env');
}
const ESBUILD_DIST_FOLDER = path.resolve(ROOT_BUNDLER_OUTPUT_DIR, 'esbuild/dist');

const getFixturePath = (packageName: string, modelName?: string) => path.resolve(...[
  MODELS_DIR,
  packageName,
  'test/__fixtures__',
  modelName === undefined || modelName === 'index' ? '' : modelName,
  'result.png'
].filter(Boolean));

describe('CDN Integration Tests', () => {
  const testRunner = new ClientsideTestRunner({
    mock: false,
    dist: ESBUILD_DIST_FOLDER,
    trackTime: TRACK_TIME,
    log: false,
  });

  const page = (): Page => {
    testRunner.page.setRequestInterception(true);
    return testRunner.page;
  }

  let fixtureServerURL: string = '';

  beforeAll(async function beforeAll() {
    await testRunner.beforeAll();
    fixtureServerURL = await testRunner.getFixturesServerURL();
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

  const evaluateUpscaler = async (page: Page): Promise<ModelPackage> => {
    const model: string = await page.evaluate(async () => {
      const upscaler = new window['Upscaler']({
        model: window['@upscalerjs/pixel-upsampler/4x'],
      });
      const model = await upscaler.getModel();
      return JSON.stringify(model);
    });
    return JSON.parse(model);
  };

  it("loads a model from the default CDN", async () => {
    const _page = page();

    const spy = vi.fn().mockImplementation((request: HTTPRequest) => {
      if (request.isInterceptResolutionHandled()) {
        throw new Error('This should not be true');
      }
      request.continue();
    });

    _page.on('request', spy);

    await evaluateUpscaler(_page);

    expect(spy).toHaveBeenCalledWithURL(CDNS[0]);
  });

  it("falls back to the second CDN if the first is not available", async () => {
    const _page = page();

    const spy = vi.fn().mockImplementation((request: HTTPRequest) => {
      if (request.isInterceptResolutionHandled()) {
        throw new Error('This should not be true');
      }
      const url = request.url();
      if (url.includes(CDNS[0])) {
        return request.abort();
      }
      request.continue();
    });

    _page.on('request', spy);

    await evaluateUpscaler(_page);

    expect(spy).toHaveBeenCalledWithURL(/https:\/\/cdn.jsdelivr(.*)\.json$/);
    expect(spy).toHaveBeenCalledWithURL(/https:\/\/unpkg(.*)\.json$/);
    expect(spy).toHaveBeenCalledWithURL(/https:\/\/unpkg(.*)\.bin$/);

    expect(spy).not.toHaveBeenCalledWithURL(/https:\/\/cdn.jsdelivr(.*)\.bin$/);
  });

  it("throws an error if no CDNs are available", async () => {
    const _page = page();

    const spy = vi.fn().mockImplementation((request: HTTPRequest) => {
      if (request.isInterceptResolutionHandled()) {
        throw new Error('This should not be true');
      }
      const url = request.url();
      if (url.includes(CDNS[0]) || url.includes(CDNS[1])) {
        return request.abort();
      }
      request.continue();
    });

    _page.on('request', spy);
    try {
      await evaluateUpscaler(_page);
      expect.unreachable('Should throw an error')
    } catch (err) {
      const isError = (err: unknown): err is Error => err instanceof Error;
      expect(err).toBeTruthy();
      if (!isError(err)) {
        throw new Error('No error returned');
      }
      expect(err.message).toMatch(LOAD_MODEL_ERROR_MESSAGE('models/4x/4x.json'))

      expect(spy).toHaveBeenCalledWithURL(/https:\/\/cdn.jsdelivr(.*)\.json$/);
      expect(spy).toHaveBeenCalledWithURL(/https:\/\/unpkg(.*)\.json$/);

      expect(spy).not.toHaveBeenCalledWithURL(/https:\/\/unpkg(.*)\.bin$/);
      expect(spy).not.toHaveBeenCalledWithURL(/https:\/\/cdn.jsdelivr(.*)\.bin$/);
    }
  });
});

declare global {
  interface Window {
    Upscaler: typeof Upscaler;
  }
}
