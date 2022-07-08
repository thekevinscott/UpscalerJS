/****
 * Tests that different supported image formats all upscale correctly.
 */
import http from 'http';
import fs from 'fs';
import path from 'path';
import { checkImage } from '../../lib/utils/checkImage';
import { bundle, DIST } from '../../lib/esm-esbuild/prepare';
import { startServer } from '../../lib/shared/server';
import puppeteer from 'puppeteer';
import * as tf from '@tensorflow/tfjs';
import Upscaler from 'upscaler';

const TRACK_TIME = false;
const JEST_TIMEOUT = 60 * 1000;
jest.setTimeout(JEST_TIMEOUT); // 60 seconds timeout
jest.retryTimes(1);

describe('Image Format Integration Tests', () => {
  let server: http.Server;
  let browser: puppeteer.Browser;
  let page: puppeteer.Page;

  const PORT = 8099;

  beforeAll(async function beforeAll() {
    const start = new Date().getTime();

    await bundle();
    server = await startServer(PORT, DIST);

    const end = new Date().getTime();
    if (TRACK_TIME) {
      console.log(`Completed pre-test scaffolding in ${Math.round((end - start) / 1000)} seconds`);
    }
  }, 20000);

  afterAll(async function imageAfterAll() {
    const start = new Date().getTime();

    const stopServer = (): Promise<void | Error> => new Promise((resolve) => {
      if (server) {
        server.close(resolve);
      } else {
        console.warn('No server found')
        resolve();
      }
    });
    await Promise.all([
      stopServer(),
    ]);
    const end = new Date().getTime();
    if (TRACK_TIME) {
      console.log(`Completed post-test clean up in ${Math.round((end - start) / 1000)} seconds`);
    }
  }, 10000);

  beforeEach(async function beforeEach() {
    browser = await puppeteer.launch();
    page = await browser.newPage();
    await page.goto(`http://localhost:${PORT}`);
    await page.waitForFunction('document.title.endsWith("| Loaded")');
  });

  afterEach(async function afterEach() {
    await browser.close();
    browser = undefined;
    page = undefined;
  });

  describe('Image formats', () => {
    it("upscales an imported local image path", async () => {
      const result = await page.evaluate(() => {
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

  //   it("upscales an HTML Image", async () => {
  //     const upscaledSrc = await page.evaluate(() => new Promise(resolve => {
  //       const upscaler = new window['Upscaler']({
  //         model: {
  //           path: '/pixelator/pixelator.json',
  //           scale: 4,
  //         },
  //       });
  //       const img = new Image();
  //       img.src = window['flower'];
  //       img.onload = function () {
  //         upscaler.upscale(img).then(resolve);
  //       }
  //     }));
  //     checkImage(upscaledSrc, "upscaled-4x-pixelator.png", 'diff.png');
  //   });

  //   it("upscales an HTML Image from the page", async () => {
  //     const upscaledSrc = await page.evaluate(() => new Promise(resolve => {
  //       const upscaler = new window['Upscaler']({
  //         model: {
  //           path: '/pixelator/pixelator.json',
  //           scale: 4,
  //         },
  //       });
  //       const img = document.createElement('img');
  //       img.id = 'img';
  //       img.src = window['flower'];
  //       document.body.append(img);
  //       img.onload = () => {
  //         upscaler.upscale(<HTMLImageElement>document.getElementById('img')).then(resolve);
  //       }
  //     }));
  //     checkImage(upscaledSrc, "upscaled-4x-pixelator.png", 'diff.png');
  //   });


  //   it("upscales a tensor", async () => {
  //     const upscaledSrc = await page.evaluate(() => new Promise(resolve => {
  //       const upscaler = new window['Upscaler']({
  //         model: {
  //           path: '/pixelator/pixelator.json',
  //           scale: 4,
  //         },
  //       });
  //       const img = new Image();
  //       img.src = window['flower'];
  //       img.crossOrigin = 'anonymous';
  //       img.onload = function () {
  //         const tensor = window['tf'].browser.fromPixels(img);
  //         upscaler.upscale(tensor).then(resolve);
  //       }
  //     }));
  //     checkImage(upscaledSrc, "upscaled-4x-pixelator.png", 'diff.png');
  //   });

  //   it("upscales a rank 4 tensor", async () => {
  //     const upscaledSrc = await page.evaluate(() => new Promise(resolve => {
  //       const upscaler = new window['Upscaler']({
  //         model: {
  //           path: '/pixelator/pixelator.json',
  //           scale: 4,
  //         },
  //       });
  //       const img = new Image();
  //       img.src = window['flower'];
  //       img.crossOrigin = 'anonymous';
  //       img.onload = function () {
  //         const tensor = window['tf'].browser.fromPixels(img).expandDims(0);
  //         upscaler.upscale(<tf.Tensor4D>tensor).then(resolve);
  //       }
  //     }));
  //     checkImage(upscaledSrc, "upscaled-4x-pixelator.png", 'diff.png');
  //   });

  //   it("upscales a base64 png path", async () => {
  //     const data = fs.readFileSync(path.resolve(__dirname, "../../__fixtures__", 'flower-small.png')).toString('base64');
  //     const originalImage = `data:image/png;base64,${data}`;
  //     const upscaledSrc = await page.evaluate(src => {
  //       const upscaler = new window['Upscaler']({
  //         model: {
  //           path: '/pixelator/pixelator.json',
  //           scale: 4,
  //         },
  //       });
  //       return upscaler.upscale(src);
  //     }, originalImage);
  //     checkImage(upscaledSrc, "upscaled-4x-pixelator.png", 'diff.png');
  //   });

  // });

  // describe('Patch sizes', () => {
  //   it("upscales an imported local image path with patch sizes", async () => {
  //     const result = await page.evaluate(() => {
  //       const upscaler = new window['Upscaler']({
  //         model: {
  //           path: '/pixelator/pixelator.json',
  //           scale: 4,
  //         },
  //       });
  //       return upscaler.upscale(window['flower'], {
  //         patchSize: 4,
  //         padding: 2,
  //       });
  //     });
  //     checkImage(result, "upscaled-4x-pixelator.png", 'diff.png');
  //   });

  });
});

declare global {
  interface Window {
    Upscaler: typeof Upscaler;
    flower: string;
    tf: typeof tf;
  }
}
