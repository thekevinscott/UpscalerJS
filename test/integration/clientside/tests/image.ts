/****
 * Tests that different supported image formats all upscale correctly.
 */
import * as tf from '@tensorflow/tfjs';
import Upscaler from 'upscaler';
import fs from 'fs';
import path from 'path';
import type { Page } from 'puppeteer';
import { MODELS_DIR } from '@internals/common/constants';
import { ClientsideTestRunner } from '@internals/test-runner/clientside';

const PIXEL_UPSAMPLER_DIR = path.resolve(MODELS_DIR, 'pixel-upsampler/test/__fixtures__');

const TRACK_TIME = true;

const ROOT_BUNDLER_OUTPUT_DIR = process.env.ROOT_BUNDLER_OUTPUT_DIR;
if (typeof ROOT_BUNDLER_OUTPUT_DIR !== 'string') {
  throw new Error('ROOT_BUNDLER_OUTPUT_DIR not defined in env');
}
const ESBUILD_DIST_FOLDER = path.resolve(ROOT_BUNDLER_OUTPUT_DIR, 'esbuild/dist');

const getFixturePath = (packageName: string, modelName: string) => path.resolve(...[
  MODELS_DIR,
  packageName,
  'test/__fixtures__',
  modelName === 'index' ? '' : modelName,
  'result.png'
].filter(Boolean));

describe('Image Format', () => {
  const testRunner = new ClientsideTestRunner({
    mock: true,
    dist: ESBUILD_DIST_FOLDER,
    trackTime: TRACK_TIME,
  });
  const page = (): Page => testRunner.page;
  let fixtureServerURL: string = '';

  beforeAll(async function beforeAll() {
    await testRunner.beforeAll();
    fixtureServerURL = await testRunner.getFixturesServerURL();
  }, 60000);

  afterAll(async function imageAfterAll() {
    await testRunner.afterAll();
  }, 10000);

  beforeEach(async function beforeEach() {
    await testRunner.beforeEach('| Loaded');
  });

  afterEach(async function afterEach() {
    await testRunner.afterEach();
  });

  describe('Image formats', () => {
    it("upscales an imported local image path", async () => {
      const fixturePath = `${fixtureServerURL}/pixel-upsampler/test/__fixtures__/fixture.png`;
      const modelPath = `${fixtureServerURL}/pixel-upsampler/models/4x/4x.json`;
      const result = await testRunner.page.evaluate(({ fixturePath, modelPath }) => {
        const upscaler = new window['Upscaler']({
          model: {
            path: modelPath,
            scale: 4,
            modelType: 'layers',
          },
        });
        return upscaler.execute(fixturePath, {
          patchSize: 64,
          padding: 2,
        });
      }, { fixturePath, modelPath });
      expect(result).toMatchImage(getFixturePath('pixel-upsampler', '4x'));
    });

    it("upscales an HTML Image", async () => {
      const fixturePath = `${fixtureServerURL}/pixel-upsampler/test/__fixtures__/fixture.png`;
      const modelPath = `${fixtureServerURL}/pixel-upsampler/models/4x/4x.json`;
      const result = await testRunner.page.evaluate(({ fixturePath, modelPath }) => new Promise((resolve) => {
        const upscaler = new window['Upscaler']({
          model: {
            path: modelPath,
            scale: 4,
            modelType: 'layers',
          },
        });
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = fixturePath;
        img.onload = function () {
          upscaler.execute(img).then(resolve);
        }
      }), { fixturePath, modelPath });
      expect(result).toMatchImage(getFixturePath('pixel-upsampler', '4x'));
    });

    it("upscales an HTML Image from the page", async () => {
      const fixturePath = `${fixtureServerURL}/pixel-upsampler/test/__fixtures__/fixture.png`;
      const modelPath = `${fixtureServerURL}/pixel-upsampler/models/4x/4x.json`;
      const result = await testRunner.page.evaluate(({ fixturePath, modelPath }) => new Promise((resolve) => {
        const upscaler = new window['Upscaler']({
          model: {
            path: modelPath,
            scale: 4,
            modelType: 'layers',
          },
        });
        const img = document.createElement('img');
        img.crossOrigin = 'anonymous';
        img.id = 'img';
        img.src = fixturePath;
        document.body.append(img);
        img.onload = () => {
          upscaler.execute(<HTMLImageElement>document.getElementById('img')).then(resolve);
        }
      }), { fixturePath, modelPath });
      expect(result).toMatchImage(getFixturePath('pixel-upsampler', '4x'));
    });

    it("upscales a tensor from an HTML image", async () => {
      const fixturePath = `${fixtureServerURL}/pixel-upsampler/test/__fixtures__/fixture.png`;
      const modelPath = `${fixtureServerURL}/pixel-upsampler/models/4x/4x.json`;
      const result = await testRunner.page.evaluate(({ fixturePath, modelPath }) => new Promise((resolve) => {
        const upscaler = new window['Upscaler']({
          model: {
            path: modelPath,
            scale: 4,
            modelType: 'layers',
          },
        });
        const img = new Image();
        img.src = fixturePath;
        img.crossOrigin = 'anonymous';
        img.onload = function () {
          const tensor = window['tf'].browser.fromPixels(img);
          upscaler.execute(tensor).then(resolve);
        }
      }), { fixturePath, modelPath });
      expect(result).toMatchImage(getFixturePath('pixel-upsampler', '4x'));
    });

    it("upscales a tensor from a Uint8Array", async () => {
      const modelPath = `${fixtureServerURL}/pixel-upsampler/models/4x/4x.json`;
      const pixels = fs.readFileSync(path.resolve(PIXEL_UPSAMPLER_DIR, 'flower-small-tensor.json'), 'utf-8');
      const result = await testRunner.page.evaluate(({ pixels, modelPath }) => new Promise((resolve) => {
        const upscaler = new window['Upscaler']({
          model: {
            path: modelPath,
            scale: 4,
            modelType: 'layers',
          },
        });
        const bytes = new Uint8Array(JSON.parse(pixels));
        const tensor = window['tf'].tensor(bytes).reshape([16, 16, 3]);
        upscaler.execute(tensor).then(resolve);
      }), { pixels, modelPath });
      expect(result).toMatchImage(getFixturePath('pixel-upsampler', '4x'));
    });

    it("upscales a rank 4 tensor", async () => {
      const modelPath = `${fixtureServerURL}/pixel-upsampler/models/4x/4x.json`;
      const fixturePath = `${fixtureServerURL}/pixel-upsampler/test/__fixtures__/fixture.png`;
      const result = await testRunner.page.evaluate(({ modelPath, fixturePath }) => new Promise((resolve) => {
        const upscaler = new window['Upscaler']({
          model: {
            path: modelPath,
            scale: 4,
            modelType: 'layers',
          },
        });
        const img = new Image();
        img.src = fixturePath;
        img.crossOrigin = 'anonymous';
        img.onload = function () {
          const tensor = window['tf'].browser.fromPixels(img).expandDims(0);
          upscaler.execute(<tf.Tensor4D>tensor).then(resolve);
        }
      }), { modelPath, fixturePath });
      expect(result).toMatchImage(getFixturePath('pixel-upsampler', '4x'));
    });

    it("upscales a base64 png path", async () => {
      const data = fs.readFileSync(path.resolve(PIXEL_UPSAMPLER_DIR, 'flower-small.png')).toString('base64');
      const originalImage = `data:image/png;base64,${data}`;
      const modelPath = `${fixtureServerURL}/pixel-upsampler/models/4x/4x.json`;
      const result = await testRunner.page.evaluate(({ modelPath, src }) => {
        const upscaler = new window['Upscaler']({
          model: {
            path: modelPath,
            scale: 4,
            modelType: 'layers',
          },
        });
        return upscaler.execute(src);
      }, { src: originalImage, modelPath });
      expect(result).toMatchImage(getFixturePath('pixel-upsampler', '4x'));
    });
  });

  describe('Patch sizes', () => {
    it("throws if given an invalid patch size and padding", async () => {
      const fixturePath = `${fixtureServerURL}/pixel-upsampler/test/__fixtures__/fixture.png`;
      const modelPath = `${fixtureServerURL}/pixel-upsampler/models/4x/4x.json`;
      const errMessage = await page().evaluate(({ modelPath, fixturePath }) => new Promise<string>((resolve, reject) => {
        const upscaler = new window['Upscaler']({
          model: {
            path: modelPath,
            scale: 4,
            modelType: 'layers',
          },
        });
        return upscaler.execute(fixturePath, {
          patchSize: 4,
          padding: 2,
        }).then(() => {
          resolve('this should not be called');
        }).catch((err: Error) => {
          return resolve(err.message);
        });
      }), { fixturePath, modelPath });
      expect(errMessage).toEqual('Invalid patch size and padding: 4 and 2. Patch size must be greater than padding * 2.');
    });

    it("upscales an imported local image path with patch sizes", async () => {
      const fixturePath = `${fixtureServerURL}/pixel-upsampler/test/__fixtures__/fixture.png`;
      const modelPath = `${fixtureServerURL}/pixel-upsampler/models/4x/4x.json`;
      const result = await page().evaluate(({ modelPath, fixturePath }) => new Promise<string>((resolve, reject) => {
        const upscaler = new window['Upscaler']({
          model: {
            path: modelPath,
            scale: 4,
            modelType: 'layers',
          },
        });
        return upscaler.execute(fixturePath, {
          patchSize: 6,
          padding: 2,
        }).then(resolve);
      }), { fixturePath, modelPath });
      expect(result).toMatchImage(getFixturePath('pixel-upsampler', '4x'));
    });
  });
});

declare global {
  interface Window {
    Upscaler: typeof Upscaler;
    flower: string;
    tf: typeof tf;
  }
}
