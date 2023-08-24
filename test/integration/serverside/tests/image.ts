import path from 'path';
import fs from 'fs';
const tf = require('@tensorflow/tfjs-node')
// import * as tf from '@tensorflow/tfjs-node';
import { RunNodeScriptError, ServersideTestRunner } from '@internals/test-runner/serverside';
import { getTemplate } from '@internals/common/get-template';
import { MODELS_DIR } from '@internals/common/constants';


const PIXEL_UPSAMPLER_DIR = path.resolve(MODELS_DIR, 'pixel-upsampler/test/__fixtures__');
const IMAGE_FIXTURE_PATH = path.resolve(PIXEL_UPSAMPLER_DIR, 'flower-small-15.jpg');
const FOUR_CHANNEL_FIXTURE_PATH = path.resolve(PIXEL_UPSAMPLER_DIR, 'flower-small.png');

const EXPECTED_UPSCALED_IMAGE_15 = path.resolve(PIXEL_UPSAMPLER_DIR, '4x/result-15.png');
const EXPECTED_UPSCALED_IMAGE_16 = path.resolve(PIXEL_UPSAMPLER_DIR, '4x/result.png');
// const DIFF_IMAGE_OUTPUT = 'diff.png';

const USE_GPU = process.env.useGPU === '1';

// TODO: How to import this, instead of copying it?
// import { getInvalidImageSrcInput } from '../../../packages/upscalerjs/src/image.node';
const getInvalidImageSrcInput = (input: string): Error => new Error([
  `Image specified at path ${input} could not be found`,
].join(' '));
export const getInvalidChannelsOfTensor = (input: tf.Tensor): Error => new Error([
  `Invalid channels, only 3 channels are supported at this time. You provided: "${input.shape.slice(-1)[0]}".`,
  `Full tensor shape: ${JSON.stringify(input.shape)}`,
].join(' '));

const ROOT_BUNDLER_OUTPUT_DIR = process.env.ROOT_BUNDLER_OUTPUT_DIR;
if (typeof ROOT_BUNDLER_OUTPUT_DIR !== 'string') {
  throw new Error('ROOT_BUNDLER_OUTPUT_DIR not defined in env');
}
const NODE_DIST_FOLDER = path.resolve(ROOT_BUNDLER_OUTPUT_DIR, 'node')

describe('Node Image Loading Integration Tests', () => {
  const testRunner = new ServersideTestRunner({
    cwd: NODE_DIST_FOLDER,
    trackTime: false,
  });
  // const testRunner = new ServerTestRunner({
  //   main,
  //   trackTime: false,
  //   dependencies: {
  //     'tf': `@tensorflow/tfjs-node`,
  //     'Upscaler': `${LOCAL_UPSCALER_NAME}/node`,
  //     'fs': 'fs',
  //     'base64ArrayBuffer': path.resolve(__dirname, '../../lib/utils/base64ArrayBuffer'),
  //     'flower_tensor': path.resolve(MODELS_DIR, 'pixel-upsampler/test/__fixtures__', 'flower-small-tensor.json'),
  //   },
  //   globals: {
  //     model: JSON.stringify({
  //       path: MODEL_PATH,
  //       scale: 4,
  //     }),
  //   },
  // });

  const runTest = async ({
    image,
    fixture,
    modelPath = '@upscalerjs/pixel-upsampler/4x',
    patchSize,
    padding,
  }: {
    image: string;
    fixture?: string;
    modelPath?: string;
    patchSize?: number;
    padding?: number;
  }) => {
    const script = await getTemplate(path.resolve(__dirname, '../_templates/image.js.t'), {
      tf: USE_GPU ? `@tensorflow/tfjs-node-gpu` : `@tensorflow/tfjs-node`,
      upscaler: USE_GPU ? `upscaler/node-gpu` : `upscaler/node`,
      image,
      customModel: modelPath,
      patchSize,
      padding,
    });
    const buffer = await testRunner.run(script);
    const result = buffer.toString('utf-8');
    if (!fixture) {
      throw new Error('No fixture provided, which may be expected if we expect an error to be thrown')
    }
    expect(`data:image/png;base64,${result}`).toMatchImage(fixture);
  }

  describe('Uint8Array', () => {
    it("upscales a Uint8Array", async () => {
      const image = new Uint8Array(fs.readFileSync(IMAGE_FIXTURE_PATH));
      await runTest({
        image: `new Uint8Array(${JSON.stringify(Array.from(image))})`,
        fixture: EXPECTED_UPSCALED_IMAGE_15,
      });
    });

    it('throws if given 4-channel Uint8Array', async () => {
      const mockedTensor = tf.node.decodeImage(fs.readFileSync(FOUR_CHANNEL_FIXTURE_PATH));

      const image = new Uint8Array(fs.readFileSync(FOUR_CHANNEL_FIXTURE_PATH));
      await expect(() => runTest({
        image: `new Uint8Array(${JSON.stringify(Array.from(image))})`,
        fixture: EXPECTED_UPSCALED_IMAGE_15,
      })).rejects.toThrowError(getInvalidChannelsOfTensor(mockedTensor));
    });
  });

  describe('Buffers', () => {
    it("upscales a Buffer", async () => {
      await runTest({
        image: `fs.readFileSync('${IMAGE_FIXTURE_PATH}')`,
        fixture: EXPECTED_UPSCALED_IMAGE_15,
      });
    });

    it("throws if a Buffer has invalid channels", async () => {
      const mockedTensor = tf.node.decodeImage(fs.readFileSync(FOUR_CHANNEL_FIXTURE_PATH));

      await expect(() => runTest({
        image: `fs.readFileSync('${FOUR_CHANNEL_FIXTURE_PATH}')`,
        fixture: EXPECTED_UPSCALED_IMAGE_15,
      })).rejects.toThrowError(getInvalidChannelsOfTensor(mockedTensor));
    });
  });

  describe('Tensors', () => {
    it("upscales a 3D Tensor", async () => {
      const flowerSmallTensor = JSON.parse(fs.readFileSync(path.resolve(MODELS_DIR, 'pixel-upsampler/test/__fixtures__', 'flower-small-tensor.json'), 'utf-8'));
      
      await runTest({
        image: `tf.tensor(${JSON.stringify(flowerSmallTensor)}).reshape([16,16,3])`,
        fixture: EXPECTED_UPSCALED_IMAGE_16,
      });
    });

    it("throws if 3D Tensor has invalid channels", async () => {
      const t = tf.ones([16,16,4]);
      await expect(() => runTest({
        image: `tf.ones([16,16,4])`,
      })).rejects.toThrowError(getInvalidChannelsOfTensor(t));
    });

    it("upscales a 4D Tensor", async () => {
      const flowerSmallTensor = JSON.parse(fs.readFileSync(path.resolve(MODELS_DIR, 'pixel-upsampler/test/__fixtures__', 'flower-small-tensor.json'), 'utf-8'));
      await runTest({
        image: `tf.tensor(${JSON.stringify(flowerSmallTensor)}).reshape([1,16,16,3])`,
        fixture: EXPECTED_UPSCALED_IMAGE_16,
      });
    });

    it("throws if 4D Tensor has invalid channels", async () => {
      const t = tf.ones([1,16,16,4]);
      await expect(() => runTest({
        image: `tf.ones([1,16,16,4])`,
      })).rejects.toThrowError(getInvalidChannelsOfTensor(t));
    });
  });

  describe('Strings', () => {
    it("upscales a string", async () => {
      await runTest({
        image: JSON.stringify(IMAGE_FIXTURE_PATH),
        fixture: EXPECTED_UPSCALED_IMAGE_15,
      });
    });

    it("throws if string provided is an invalid path", async () => {
      const input = 'foobarbaz';
      await expect(() => runTest({
        image: JSON.stringify(input),
      })).rejects.toThrowError(getInvalidImageSrcInput(input));
    });

    it("throws if string provided is an invalid image", async () => {
      await expect(() => runTest({
        image: JSON.stringify(path.resolve(IMAGE_FIXTURE_PATH, 'bad-image.png')),
      })).rejects.toThrow();
    });
  });

  describe('Patch sizes', () => {
    it("upscales an imported local image path with patch sizes", async () => {
      await runTest({
        image: JSON.stringify(IMAGE_FIXTURE_PATH),
        patchSize: 6,
        padding: 2,
        fixture: EXPECTED_UPSCALED_IMAGE_15,
      });
    });
  });
});
