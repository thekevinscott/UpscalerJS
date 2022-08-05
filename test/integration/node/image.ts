import path from 'path';
import http from 'http';
import fs from 'fs';
import * as tf from '@tensorflow/tfjs-node';
import { checkImage } from '../../lib/utils/checkImage';
import { prepareScriptBundleForNodeCJS } from '../../lib/node/prepare';
import { LOCAL_UPSCALER_NAME } from '../../lib/node/constants';
import { Main, NodeTestRunner } from '../utils/NodeTestRunner';
const FIXTURES_PATH = path.resolve(__dirname, '../../__fixtures__');
const IMAGE_FIXTURE_PATH = path.resolve(FIXTURES_PATH, 'flower-small-15.jpg');
const BAD_IMAGE_FIXTURE_PATH = path.resolve(FIXTURES_PATH, 'flower-small.png');
const MODEL_PATH = 'file://' + path.join(FIXTURES_PATH, 'pixelator/pixelator.json');
const EXPECTED_UPSCALED_IMAGE_15 = 'upscaled-4x-pixelator-15.png';
const EXPECTED_UPSCALED_IMAGE_16 = 'upscaled-4x-pixelator.png';
const DIFF_IMAGE_OUTPUT = 'diff.png';

// TODO: How to import this, instead of copying it?
// import { getInvalidImageSrcInput } from '../../../packages/upscalerjs/src/image.node';
const getInvalidImageSrcInput = (input: string): Error => new Error([
  `Image specified at path ${input} could not be found`,
].join(' '));
export const getInvalidChannelsOfTensor = (input: tf.Tensor): Error => new Error([
  `Invalid channels, only 3 channels are supported at this time. You provided: "${input.shape.slice(-1)[0]}".`,
  `Full tensor shape: ${JSON.stringify(input.shape)}`,
].join(' '));

const JEST_TIMEOUT = 60 * 1000;
jest.setTimeout(JEST_TIMEOUT * 1); // 60 seconds timeout

const main: Main = async (deps) => {
  const {
    Upscaler,
    tf,
    base64ArrayBuffer,
    model,
    image,
    patchSize,
    padding,
  } = deps;
  const upscaler = new Upscaler({
    model,
  });
  const result = await upscaler.upscale(image, {
    output: 'tensor',
    patchSize,
    padding,
  });
  try {
    image.dispose(); // if it is a tensor, dispose of it
  } catch(err) {}
  // because we are requesting a tensor, it is possible that the tensor will
  // contain out-of-bounds pixels; part of the value of this test is ensuring
  // that those values are clipped in a post-process step.
  const upscaledImage = await tf.node.encodePng(result);
  result.dispose();
  return base64ArrayBuffer(upscaledImage);
};

describe('Node Image Loading Integration Tests', () => {
  const testRunner = new NodeTestRunner({
    main,
    trackTime: false,
    dependencies: {
      'tf': `@tensorflow/tfjs-node`,
      'Upscaler': `${LOCAL_UPSCALER_NAME}/node`,
      'fs': 'fs',
      'base64ArrayBuffer': path.resolve(__dirname, '../../lib/utils/base64ArrayBuffer'),
      'flower_tensor': path.resolve(__dirname, '../../__fixtures__', 'flower-small-tensor.json'),
    },
    globals: {
      model: JSON.stringify({
        path: MODEL_PATH,
        scale: 4,
      }),
    },
  });
  beforeAll(async () => {
    await testRunner.beforeAll(prepareScriptBundleForNodeCJS);
  });

  describe('Uint8Array', () => {
    it("upscales a Uint8Array", async () => {
      const result = await testRunner.test({
        globals: {
          image: `new Uint8Array(fs.readFileSync('${IMAGE_FIXTURE_PATH}'))`,
        },
      });
      checkImage(`data:image/png;base64,${result}`, EXPECTED_UPSCALED_IMAGE_15, DIFF_IMAGE_OUTPUT);
    });

    it('throws if given 4-channel Uint8Array', async () => {
      const mockedTensor = tf.node.decodeImage(fs.readFileSync(BAD_IMAGE_FIXTURE_PATH));
      await expect(() => testRunner.test({
        globals: {
          image: `new Uint8Array(fs.readFileSync('${BAD_IMAGE_FIXTURE_PATH}'))`,
        },
      })).rejects.toThrowError(getInvalidChannelsOfTensor(mockedTensor));
    });
  });

  describe('Buffers', () => {
    it("upscales a Buffer", async () => {
      const result = await testRunner.test({
        globals: {
          image: `fs.readFileSync('${IMAGE_FIXTURE_PATH}')`,
        },
      });
      checkImage(`data:image/png;base64,${result}`, EXPECTED_UPSCALED_IMAGE_15, DIFF_IMAGE_OUTPUT);
    });

    it("throws if a Buffer has invalid channels", async () => {
      const mockedTensor = tf.node.decodeImage(fs.readFileSync(BAD_IMAGE_FIXTURE_PATH));
      await expect(() => testRunner.test({
        globals: {
          image: `fs.readFileSync('${BAD_IMAGE_FIXTURE_PATH}')`,
        },
      })).rejects.toThrowError(getInvalidChannelsOfTensor(mockedTensor));
    });
  });

  describe('Tensors', () => {
    it("upscales a 3D Tensor", async () => {
      const result = await testRunner.test({
        globals: {
          image: `tf.tensor(new Uint8Array(flower_tensor)).reshape([16, 16, 3])`,
        },
      });
      checkImage(`data:image/png;base64,${result}`, EXPECTED_UPSCALED_IMAGE_16, DIFF_IMAGE_OUTPUT);
    });

    it("throws if 3D Tensor has invalid channels", async () => {
      const t = tf.ones([16,16,4]);
      await expect(() => testRunner.test({
        globals: {
          image: `tf.ones([16,16,4])`,
        },
      })).rejects.toThrowError(getInvalidChannelsOfTensor(t));
    });

    it("upscales a 4D Tensor", async () => {
      const result = await testRunner.test({
        globals: {
          image: `tf.tensor(new Uint8Array(flower_tensor)).reshape([1, 16, 16, 3])`,
        },
      });
      checkImage(`data:image/png;base64,${result}`, EXPECTED_UPSCALED_IMAGE_16, DIFF_IMAGE_OUTPUT);
    });

    it("throws if 4D Tensor has invalid channels", async () => {
      const t = tf.ones([1,16,16,4]);
      await expect(() => testRunner.test({
        globals: {
          image: `tf.ones([1,16,16,4])`,
        },
      })).rejects.toThrowError(getInvalidChannelsOfTensor(t));
    });
  });

  describe('Strings', () => {
    it("upscales a string", async () => {
      const result = await testRunner.test({
        globals: {
          image: JSON.stringify(IMAGE_FIXTURE_PATH),
        },
      });
      checkImage(`data:image/png;base64,${result}`, EXPECTED_UPSCALED_IMAGE_15, DIFF_IMAGE_OUTPUT);
    });

    it("throws if string provided is an invalid path", async () => {
      const input = 'foobarbaz';
      await expect(() => testRunner.test({
        globals: {
          image: JSON.stringify(input),
        },
      })).rejects.toThrowError(getInvalidImageSrcInput(input));
    });

    it("throws if string provided is an invalid image", async () => {
      await expect(() => testRunner.test({
        globals: {
          image: JSON.stringify(path.resolve(FIXTURES_PATH, 'bad-image.png')),
        },
      })).rejects.toThrow();
    });
  });

  describe('Patch sizes', () => {
    it("upscales an imported local image path with patch sizes", async () => {
      const result = await testRunner.test({
        globals: {
          image: JSON.stringify(IMAGE_FIXTURE_PATH),
          patchSize: 4,
          padding: 2,
        },
      });
      checkImage(`data:image/png;base64,${result}`, EXPECTED_UPSCALED_IMAGE_15, DIFF_IMAGE_OUTPUT);
    });
  });
});
