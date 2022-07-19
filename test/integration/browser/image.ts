/****
 * Tests that different supported image formats all upscale correctly.
 */
import { checkImage } from '../../lib/utils/checkImage';
import { bundle, DIST, mockCDN as esbuildMockCDN } from '../../lib/esm-esbuild/prepare';
import * as tf from '@tensorflow/tfjs';
import Upscaler from 'upscaler';
import fs from 'fs';
import path from 'path';
import type puppeteer from 'puppeteer';
import { BrowserTestRunner } from '../utils/BrowserTestRunner';

const flowerPixels = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../__fixtures__/flower-small-tensor.json'), 'utf-8'));

const TRACK_TIME = false;
const JEST_TIMEOUT = 60 * 1000;
jest.setTimeout(JEST_TIMEOUT); // 60 seconds timeout
jest.retryTimes(0);

describe('Image Format Integration Tests', () => {
  const testRunner = new BrowserTestRunner({
    mockCDN: esbuildMockCDN,
    dist: DIST,
    trackTime: TRACK_TIME,
  });
  const page = (): puppeteer.Page => testRunner.page;

  beforeAll(async function beforeAll() {
    await testRunner.beforeAll(bundle);
  }, 20000);

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
            path: '/pixelator/pixelator.json',
            scale: 4,
          },
        });
        return upscaler.upscale(window['flower']);
      });
      checkImage(result, "upscaled-4x-pixelator.png", 'diff.png');
    });

    it("upscales an HTML Image", async () => {
      const upscaledSrc = await page().evaluate(() => new Promise(resolve => {
        const upscaler = new window['Upscaler']({
          model: {
            path: '/pixelator/pixelator.json',
            scale: 4,
          },
        });
        const img = new Image();
        img.src = window['flower'];
        img.onload = function () {
          upscaler.upscale(img).then(resolve);
        }
      }), []);
      checkImage(upscaledSrc, "upscaled-4x-pixelator.png", 'diff.png');
    });

    it("upscales an HTML Image from the page", async () => {
      const upscaledSrc = await page().evaluate(() => new Promise(resolve => {
        const upscaler = new window['Upscaler']({
          model: {
            path: '/pixelator/pixelator.json',
            scale: 4,
          },
        });
        const img = document.createElement('img');
        img.id = 'img';
        img.src = window['flower'];
        document.body.append(img);
        img.onload = () => {
          upscaler.upscale(<HTMLImageElement>document.getElementById('img')).then(resolve);
        }
      }));
      checkImage(upscaledSrc, "upscaled-4x-pixelator.png", 'diff.png');
    });

    it("upscales a tensor from an HTML image", async () => {
      const upscaledSrc = await page().evaluate(() => new Promise(resolve => {
        const upscaler = new window['Upscaler']({
          model: {
            path: '/pixelator/pixelator.json',
            scale: 4,
          },
        });
        const img = new Image();
        img.src = window['flower'];
        img.crossOrigin = 'anonymous';
        img.onload = function () {
          const tensor = window['tf'].browser.fromPixels(img);
          upscaler.upscale(tensor).then(resolve);
        }
      }));
      checkImage(upscaledSrc, "upscaled-4x-pixelator.png", 'diff.png');
    });

    it("upscales a tensor from a Uint8Array", async () => {
      const upscaledSrc = await page().evaluate((pixels) => new Promise(resolve => {
        const upscaler = new window['Upscaler']({
          model: {
            path: '/pixelator/pixelator.json',
            scale: 4,
          },
        });
        const bytes = new Uint8Array(pixels);
        const tensor = tf.tensor(bytes).reshape([16, 16, 3]) as tf.Tensor3D;
        upscaler.upscale(tensor).then(resolve);
      }), flowerPixels);
      checkImage(upscaledSrc, "upscaled-4x-pixelator.png", 'diff.png');
    });

    it("upscales a rank 4 tensor", async () => {
      const upscaledSrc = await page().evaluate(() => new Promise(resolve => {
        const upscaler = new window['Upscaler']({
          model: {
            path: '/pixelator/pixelator.json',
            scale: 4,
          },
        });
        const img = new Image();
        img.src = window['flower'];
        img.crossOrigin = 'anonymous';
        img.onload = function () {
          const tensor = window['tf'].browser.fromPixels(img).expandDims(0);
          upscaler.upscale(<tf.Tensor4D>tensor).then(resolve);
        }
      }));
      checkImage(upscaledSrc, "upscaled-4x-pixelator.png", 'diff.png');
    });

    it("upscales a base64 png path", async () => {
      const data = fs.readFileSync(path.resolve(__dirname, "../../__fixtures__", 'flower-small.png')).toString('base64');
      const originalImage = `data:image/png;base64,${data}`;
      const upscaledSrc = await page().evaluate(src => {
        const upscaler = new window['Upscaler']({
          model: {
            path: '/pixelator/pixelator.json',
            scale: 4,
          },
        });
        return upscaler.upscale(src);
      }, originalImage);
      checkImage(upscaledSrc, "upscaled-4x-pixelator.png", 'diff.png');
    });
  });

  describe('Patch sizes', () => {
    it("upscales an imported local image path with patch sizes", async () => {
      const result = await page().evaluate(() => {
        const upscaler = new window['Upscaler']({
          model: {
            path: '/pixelator/pixelator.json',
            scale: 4,
          },
        });
        return upscaler.upscale(window['flower'], {
          patchSize: 4,
          padding: 2,
        });
      });
      checkImage(result, "upscaled-4x-pixelator.png", 'diff.png');
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
