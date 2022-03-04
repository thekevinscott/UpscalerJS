/****
 * Tests that different supported image formats all upscale correctly.
 */
import * as tf from '@tensorflow/tfjs';
import { checkImage } from '../../lib/utils/checkImage';
import { bundle, DIST } from '../../lib/esm-esbuild/prepare';
import { startServer } from '../../lib/shared/server';
import puppeteer, { WaitTask } from 'puppeteer';

const TRACK_TIME = false;
const JEST_TIMEOUT = 60 * 1000;
jest.setTimeout(JEST_TIMEOUT); // 60 seconds timeout
jest.retryTimes(1);

describe('Upscale Integration Tests', () => {
  let server;
  let browser;
  let page;

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

    const stopServer = () => new Promise((resolve) => {
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

  it("upscales an imported local image path", async () => {
    const result = await page.evaluate(() => {
      const upscaler = new window['Upscaler']({
        model: '/pixelator/pixelator.json',
        scale: 4,
      });
      return upscaler.upscale(window['flower']);
    });
    checkImage(result, "upscaled-4x-pixelator.png", 'diff.png');
  });

  describe('Cancel', () => {
    it("cancels an inflight upscale request", async () => {
      const errMessage = await page.evaluate(() => new Promise(resolve => {
        const abortController = new AbortController();
        const upscaler = new window['Upscaler']({
          model: '/pixelator/pixelator.json',
          scale: 4,
          warmupSizes: [{
            patchSize: 4,
            padding: 2,
          }]
        });
        window['progressRates'] = [];
        window['called'] = false;

        let startTime = new Date().getTime();
        window['durations'] = [];
        upscaler.upscale(window['flower'], {
          patchSize: 4,
          padding: 2,
          output: 'src',
          signal: abortController.signal,
          progress: (rate) => {
            const curTime = new Date().getTime();
            window['durations'].push(curTime - startTime);
            startTime = curTime;
            window['progressRates'].push(rate);
            if (rate >= .5) {
              abortController.abort();
            }
          },
        }).then(() => {
          window['called'] = true;
          resolve('this should not be called');
        }).catch(err => {
          return resolve(err.message);
        });
      }));
      expect(errMessage).toEqual('The upscale request received an abort signal');
      const [progressRates, called] = await page.evaluate(() => new Promise(resolve => {
        const durations = window['durations'].slice(1); // skip the first entry, it's usually slower than the others
        const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length;
        setTimeout(() => {
          resolve([
            window['progressRates'],
            window['called'],
        ]);
        }, avg * 2); // wait the average time for a progress event, PLUS another, to make sure we catch any stray calls
      }));
      const expectedRates = Array(8).fill('').map((_, i) => (i + 1) / 16);
      expect(progressRates).toEqual(expectedRates);
      expect(called).toEqual(false);
    });
  });

  describe('Progress Method', () => {
    it("calls back to progress the correct number of times", async () => {
      const progressRates = await page.evaluate(() => new Promise(resolve => {
        const upscaler = new window['Upscaler']({
          model: '/pixelator/pixelator.json',
          scale: 4,
        });
        let progressRates = [];
        upscaler.upscale(window['flower'], {
          patchSize: 8,
          padding: 2,
          output: 'src',
          progress: (rate) => {
            progressRates.push(rate);
          },
        }).then(() => {
          resolve(progressRates);
        });
      }));
      expect(progressRates).toEqual([.25, .5, .75, 1]);
    });

    it("calls back to progress with a src", async () => {
      const [rate, slice] = await page.evaluate(() => new Promise(resolve => {
        const upscaler = new window['Upscaler']({
          model: '/pixelator/pixelator.json',
          scale: 4,
        });
        upscaler.upscale(window['flower'], {
          patchSize: 12,
          padding: 2,
          output: 'src',
          progress: (rate, slice) => {
            resolve([rate, slice]);

          },
        });
      }));
      expect(typeof rate).toEqual('number');
      checkImage(slice, "slice-patchsize-12-padding-2.png", 'diff.png');
    });

    it("calls back to progress with a tensor", async () => {
      const [rate, slice] = await page.evaluate(() => new Promise(resolve => {
        const upscaler = new window['Upscaler']({
          model: '/pixelator/pixelator.json',
          scale: 4,
        });
        upscaler.upscale(window['flower'], {
          patchSize: 12,
          padding: 2,
          output: 'tensor',
          progress: (rate, slice) => {
            resolve([rate, slice]);
          },
        });
      }));
      expect(typeof rate).toEqual('number');
      expect(slice.shape).toEqual([48, 48, 3]);
    });
  });
});
