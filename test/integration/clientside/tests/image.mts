/****
 * Tests that different supported image formats all upscale correctly.
 */
import { checkImage } from '../../../lib/utils/checkImage.js';
import { ESBUILD_DIST } from '../../../lib/esm-esbuild/prepare.js';
import { describe, it, expect } from 'vitest';
import * as tf from '@tensorflow/tfjs';
import Upscaler from 'upscaler';
import fs from 'fs';
import * as path from 'path';
import type { Page } from 'puppeteer';
import { MODELS_DIR } from '@internals/common/constants';
import { ClientsideTestRunner } from '@internals/test-runner/clientside';

const PIXEL_UPSAMPLER_DIR = path.resolve(MODELS_DIR, 'pixel-upsampler/test/__fixtures__');

const flowerPixels = JSON.parse(fs.readFileSync(path.resolve(PIXEL_UPSAMPLER_DIR, 'flower-small-tensor.json'), 'utf-8'));

describe('Image Format Integration Tests', () => {
  const testRunner = new ClientsideTestRunner({
    mock: true,
    dist: ESBUILD_DIST,
  });
  const page = (): Page => testRunner.page;

  beforeAll(async function beforeAll() {
    await testRunner.beforeAll();
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
      const result = await page().evaluate(() => {
        const upscaler = new window['Upscaler']({
          model: {
            path: '/models/pixel-upsampler/models/x4/x4.json',
            scale: 4,
            modelType: 'layers',
          },
        });
        return upscaler.execute(window['fixtures']['pixel-upsampler']);
      });
      expect(result).toMatchImage(path.resolve(PIXEL_UPSAMPLER_DIR, "x4/result.png"));
    });

    it("upscales an HTML Image", async () => {
      const result = await page().evaluate(() => new Promise(resolve => {
        const upscaler = new window['Upscaler']({
          model: {
            path: '/models/pixel-upsampler/models/x4/x4.json',
            scale: 4,
            modelType: 'layers',
          },
        });
        const img = new Image();
        img.src = window['fixtures']['pixel-upsampler'];
        img.onload = function () {
          upscaler.execute(img).then(resolve);
        }
      }), []);
      expect(result).toMatchImage(path.resolve(PIXEL_UPSAMPLER_DIR, "x4/result.png"));
    });

    it("upscales an HTML Image from the page", async () => {
      const result = await page().evaluate(() => new Promise(resolve => {
        const upscaler = new window['Upscaler']({
          model: {
            path: '/models/pixel-upsampler/models/x4/x4.json',
            scale: 4,
            modelType: 'layers',
          },
        });
        const img = document.createElement('img');
        img.id = 'img';
        img.src = window['fixtures']['pixel-upsampler'];
        document.body.append(img);
        img.onload = () => {
          upscaler.execute(<HTMLImageElement>document.getElementById('img')).then(resolve);
        }
      }));
      expect(result).toMatchImage(path.resolve(PIXEL_UPSAMPLER_DIR, "x4/result.png"));
    });

    it("upscales a tensor from an HTML image", async () => {
      const result = await page().evaluate(() => new Promise(resolve => {
        const upscaler = new window['Upscaler']({
          model: {
            path: '/models/pixel-upsampler/models/x4/x4.json',
            scale: 4,
            modelType: 'layers',
          },
        });
        const img = new Image();
        img.src = window['fixtures']['pixel-upsampler'];
        img.crossOrigin = 'anonymous';
        img.onload = function () {
          const tensor = window['tf'].browser.fromPixels(img);
          upscaler.execute(tensor).then(resolve);
        }
      }));
      expect(result).toMatchImage(path.resolve(PIXEL_UPSAMPLER_DIR, "x4/result.png"));
    });

    it("upscales a tensor from a Uint8Array", async () => {
      const result = await page().evaluate((pixels) => new Promise(resolve => {
        const upscaler = new window['Upscaler']({
          model: {
            path: '/models/pixel-upsampler/models/x4/x4.json',
            scale: 4,
            modelType: 'layers',
          },
        });
        const bytes = new Uint8Array(pixels);
        const tensor = window['tf'].tensor(bytes).reshape([16, 16, 3]) as tf.Tensor3D;
        upscaler.execute(tensor).then(resolve);
      }), flowerPixels);
      expect(result).toMatchImage(path.resolve(PIXEL_UPSAMPLER_DIR, "x4/result.png"));
    });

    it("upscales a rank 4 tensor", async () => {
      const result = await page().evaluate(() => new Promise(resolve => {
        const upscaler = new window['Upscaler']({
          model: {
            path: '/models/pixel-upsampler/models/x4/x4.json',
            scale: 4,
            modelType: 'layers',
          },
        });
        const img = new Image();
        img.src = window['fixtures']['pixel-upsampler'];
        img.crossOrigin = 'anonymous';
        img.onload = function () {
          const tensor = window['tf'].browser.fromPixels(img).expandDims(0);
          upscaler.execute(<tf.Tensor4D>tensor).then(resolve);
        }
      }));
      expect(result).toMatchImage(path.resolve(PIXEL_UPSAMPLER_DIR, "x4/result.png"));
    });

    it("upscales a base64 png path", async () => {
      const data = fs.readFileSync(path.resolve(PIXEL_UPSAMPLER_DIR, 'flower-small.png')).toString('base64');
      const originalImage = `data:image/png;base64,${data}`;
      const result = await page().evaluate(src => {
        const upscaler = new window['Upscaler']({
          model: {
            path: '/models/pixel-upsampler/models/x4/x4.json',
            scale: 4,
            modelType: 'layers',
          },
        });
        return upscaler.execute(src);
      }, originalImage);
      expect(result).toMatchImage(path.resolve(PIXEL_UPSAMPLER_DIR, "x4/result.png"));
    });
  });

  describe('Patch sizes', () => {
    it("throws if given an invalid patch size and padding", async () => {
      const errMessage = await page().evaluate(() => new Promise((resolve, reject) => {
        const upscaler = new window['Upscaler']({
          model: {
            path: '/models/pixel-upsampler/models/x4/x4.json',
            scale: 4,
            modelType: 'layers',
          },
        });
        return upscaler.execute(window['fixtures']['pixel-upsampler'], {
          patchSize: 4,
          padding: 2,
        }).then(() => {
          resolve('this should not be called');
        }).catch((err: Error) => {
          return resolve(err.message);
        });
      }));

      expect(errMessage).toEqual('Invalid patch size and padding: 4 and 2. Patch size must be greater than padding * 2.');
    });

    it("upscales an imported local image path with patch sizes", async () => {
      const result = await page().evaluate(() => {
        const upscaler = new window['Upscaler']({
          model: {
            path: '/models/pixel-upsampler/models/x4/x4.json',
            scale: 4,
            modelType: 'layers',
          },
        });
        return upscaler.execute(window['fixtures']['pixel-upsampler'], {
          patchSize: 6,
          padding: 2,
        });
      });
      expect(result).toMatchImage(path.resolve(PIXEL_UPSAMPLER_DIR, "x4/result.png"));
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
