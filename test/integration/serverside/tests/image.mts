import path from 'path';
import fs from 'fs';
import { expect, describe, it, test } from 'vitest';
import * as tf from '@tensorflow/tfjs-node';
import { checkImage } from '../../lib/utils/checkImage';
import { MODELS_DIR } from '@internals/common/constants';
import { ServersideTestRunner } from '@internals/test-runner/serverside';
import { getTemplate as _getTemplate } from '@internals/common/get-template';

const PIXEL_UPSAMPLER_DIR = path.resolve(MODELS_DIR, 'pixel-upsampler/test/__fixtures__');
const IMAGE_FIXTURE_PATH = path.resolve(PIXEL_UPSAMPLER_DIR, 'flower-small-15.jpg');
const FOUR_CHANNEL_FIXTURE_PATH = path.resolve(PIXEL_UPSAMPLER_DIR, 'flower-small.png');

const EXPECTED_UPSCALED_IMAGE_15 = path.resolve(PIXEL_UPSAMPLER_DIR, 'x4/result-15.png');
const EXPECTED_UPSCALED_IMAGE_16 = path.resolve(PIXEL_UPSAMPLER_DIR, 'x4/result.png');
const DIFF_IMAGE_OUTPUT = 'diff.png';

const USE_GPU = process.env.useGPU === '1';

// TODO: How to import this, instead of copying it?
// import { getInvalidImageSrcInput } from '../../../packages/upscalerjs/src/shared/image.node';
const getInvalidImageSrcInput = (input: string): Error => new Error([
  `Image specified at path ${input} could not be found`,
].join(' '));
export const getInvalidChannelsOfTensor = (input: tf.Tensor): Error => new Error([
  `Invalid channels, only 3 channels are supported at this time. You provided: "${input.shape.slice(-1)[0]}".`,
  `Full tensor shape: ${JSON.stringify(input.shape)}`,
].join(' '));

const NODE_DIST_FOLDER = process.env.NODE_DIST_FOLDER;
if (typeof NODE_DIST_FOLDER !== 'string') {
  throw new Error('NODE_DIST_FOLDER not defined in env');
}

const getTemplate = (
  templateName: string,
  args: Parameters<typeof _getTemplate>[1] = {}
) => _getTemplate(path.resolve(NODE_DIST_FOLDER, templateName), args);

describe('Node Image Loading Integration Tests', () => {
  const testRunner = new ServersideTestRunner({
    cwd: NODE_DIST_FOLDER,
    trackTime: false,
  });

  const runTest = async ({
    image,
    fixture,
    modelPath = '@upscalerjs/pixel-upsampler/x4',
    patchSize,
    padding,
    logErrors = true,
  }: {
    image: string;
    fixture?: string;
    modelPath?: string;
    patchSize?: number;
    padding?: number;
    logErrors?: boolean;
  }) => {
    const script = await getTemplate(path.resolve(__dirname, '../_templates/image.js.ejs'), {
      tf: USE_GPU ? `@tensorflow/tfjs-node-gpu` : `@tensorflow/tfjs-node`,
      upscaler: USE_GPU ? `upscaler/node-gpu` : `upscaler/node`,
      image,
      customModel: modelPath,
      patchSize,
      padding,
    });
    const buffer = await testRunner.run(script, logErrors);
    const result = buffer.toString('utf-8');
    if (!fixture) {
      throw new Error('No fixture provided, which may be expected if we expect an error to be thrown')
    }
    // expect(`data:image/png;base64,${result}`).toMatchImage(fixture);
    checkImage(`data:image/png;base64,${result}`, fixture, DIFF_IMAGE_OUTPUT);
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
        logErrors: false,
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
        logErrors: false,
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
        logErrors: false,
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
        logErrors: false,
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
        logErrors: false,
      })).rejects.toThrowError(getInvalidImageSrcInput(input));
    });

    it("throws if string provided is an invalid image", async () => {
      await expect(() => runTest({
        image: JSON.stringify(path.resolve(IMAGE_FIXTURE_PATH, 'bad-image.png')),
        logErrors: false,
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
