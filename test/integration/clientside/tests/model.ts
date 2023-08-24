/****
 * Tests that different approaches to loading a model all load correctly
 */
import Upscaler, { ModelDefinition } from 'upscaler';
import * as tf from '@tensorflow/tfjs';
import type { Tensor3D, } from '@tensorflow/tfjs';
import * as tfn from '@tensorflow/tfjs-node';
import path from 'path';
import { MODELS_DIR } from '@internals/common/constants';
import { ClientsideTestRunner } from '@internals/test-runner/clientside';

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

describe('Model Loading', () => {
  const testRunner = new ClientsideTestRunner({
    mock: true,
    dist: ESBUILD_DIST_FOLDER,
    trackTime: TRACK_TIME,
  });
  const page = () => testRunner.page;

  let fixtureServerURL: string = '';

  beforeAll(async function beforeAll() {
    await testRunner.beforeAll();
    fixtureServerURL = await testRunner.getFixturesServerURL();
  }, 60000);

  afterAll(async function afterAll() {
    await testRunner.afterAll();
  }, 10000);

  beforeEach(async function beforeEach() {
    await testRunner.beforeEach('| Loaded');
  });

  afterEach(async function afterEach() {
    await testRunner.afterEach();
  });

  it("loads the default model", async () => {
    const fixturePath = `${fixtureServerURL}/default-model/test/__fixtures__/fixture.png`;
    const result = await page().evaluate(({ fixturePath }) => {
      const upscaler = new window['Upscaler']();
      return upscaler.execute(fixturePath);
    }, { fixturePath });
    expect(result).toMatchImage(getFixturePath('default-model'));
  });

  it("can import a specific model", async () => {
    const fixturePath = `${fixtureServerURL}/pixel-upsampler/test/__fixtures__/fixture.png`;
    const result = await page().evaluate(({ fixturePath }) => {
      const upscaler = new window['Upscaler']({
        model: window['@upscalerjs/pixel-upsampler/4x'],
      });
      return upscaler.execute(fixturePath);
    }, { fixturePath });
    expect(result).toMatchImage(getFixturePath('pixel-upsampler', '4x'));
  });

  it("loads a locally exposed model via HTTP", async () => {
    const fixturePath = `${fixtureServerURL}/pixel-upsampler/test/__fixtures__/fixture.png`;
    const modelPath = `${fixtureServerURL}/pixel-upsampler/models/4x/4x.json`;
    const result = await page().evaluate(({ fixturePath, modelPath }) => {
      const upscaler = new window['Upscaler']({
        model: {
          path: modelPath,
          scale: 4,
          modelType: 'layers',
        },
      });
      return upscaler.execute(fixturePath);
    }, { fixturePath, modelPath });
    expect(result).toMatchImage(getFixturePath('pixel-upsampler', '4x'));
  });

  it('clips a model that returns out of bound numbers when returning a base64 string src', async () => {
    const startingPixels = [-100,-100,-100,0,0,0,255,255,255,1000,1000,1000];
    const predictedPixels = await page().evaluate(({ startingPixels }) => {
      const tf = window['tf'];
      const upscaler = new window['Upscaler']({
        model: window['@upscalerjs/pixel-upsampler/2x'],
      });
      const tensor = tf.tensor(startingPixels).reshape([2,2,3]) as Tensor3D;
      const loadImage = (src: string): Promise<HTMLImageElement> => new Promise(resolve => {
        const img = new Image();
        img.src = src;
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
      });
      return upscaler.execute(tensor).then((output) => {
        return loadImage(output);
      }).then((img: HTMLImageElement) => {
        const predictedPixels = tf.browser.fromPixels(img);
        return Array.from(predictedPixels.dataSync());
      });
    }, { startingPixels });
    expect(predictedPixels.length).toEqual(4*4*3);
    const predictedTensor = tfn.tensor(predictedPixels).reshape([4,4,3]);
    const expectedTensor = tfn.image.resizeNearestNeighbor(tfn.tensor(startingPixels).reshape([2,2,3]).clipByValue(0, 255) as Tensor3D, [4,4]);
    expect(expectedTensor.dataSync()).toEqual(predictedTensor.dataSync())
  });
});

declare global {
  interface Window {
    Upscaler: typeof Upscaler;
    tf: typeof tf;
    fixtures: Record<string, string>;
    'pixel-upsampler': Record<string, ModelDefinition>;
    'esrgan-legacy': Record<string, ModelDefinition>;
    PixelUpsampler2x: ModelDefinition;
  }
}
