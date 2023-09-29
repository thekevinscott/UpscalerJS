import { readFileSync } from 'fs';
import { vi } from 'vitest';
import path from 'path';
import { 
  getImageAsTensor, 
  getInvalidInput,
  tensorAsBase64,
  getInvalidTensorError,
  getInvalidImageSrcInput,
} from './image.node';
import * as tf from '@tensorflow/tfjs-node';
import {
  hasValidChannels,
} from '@upscalerjs/core'

import type * as core from '@upscalerjs/core';
import type * as fs from 'fs';
import * as url from 'url';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

vi.mock('@upscalerjs/core', async () => {
  const { hasValidChannels, ...rest } = await vi.importActual('@upscalerjs/core') as typeof core;
  return { 
    ...rest,
    hasValidChannels: vi.fn(hasValidChannels),
  }
});
vi.mock('fs', async () => {
  const { readFileSync, ...rest } = await vi.importActual('fs') as typeof fs;
  return { 
    ...rest,
    readFileSync: vi.fn(readFileSync),
  }
});

const getTensorRange = (width: number, height: number): tf.Tensor1D => tf.tidy(() => tf.range(1, 1 + (width * height), 1));
const getTensor = (height: number, width: number): tf.Tensor3D => tf.tidy(() => getTensorRange(width, height).reshape([height, width, 1]).tile([1, 1, 3]));

const FLOWER = path.resolve(__dirname, '../test/__fixtures__/flower-small.jpg');
const image = readFileSync(FLOWER);

describe('Image', () => {
  beforeEach(() => {
    vi.mocked(readFileSync);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getImageAsTensor', () => {
    it('handles a uint array', async () => {
      const result = await getImageAsTensor(tf, image);
      expect(result.shape).toEqual([1,16,16,3,]);
    });

    it('handles a buffer', async () => {
      const result = await getImageAsTensor(tf, image);
      expect(result.shape).toEqual([1,16,16,3,]);
    });

    it('handles a local string path to a file', async () => {
      const result = await getImageAsTensor(tf, FLOWER);
      expect(result.shape).toEqual([1,16,16,3,]);
    });

    it('reads a rank 4 tensor directly without manipulation', async () => {
      const height = 3;
      const width = 2;
      const input = getTensor(height, width).expandDims(0) as tf.Tensor4D;
      const result = await getImageAsTensor(tf, input);
      expect(result.shape).toEqual([1,height, width, 3,]);
    });

    it('reads a rank 3 tensor and expands to rank 4', async () => {
      const height = 3;
      const width = 2;
      const input = getTensor(height, width);
      const result = await getImageAsTensor(tf, input);
      expect(result.shape).toEqual([1,height, width, 3,]);
    });

    it('handles an invalid (too small) tensor input', async () => {
      vi.mocked(hasValidChannels).mockReturnValue(true);
      const input = tf.tensor([[1,],]);
      await expect(() => getImageAsTensor(tf, input as tf.Tensor3D))
        .rejects
        .toThrow(getInvalidTensorError(input));
    });

    it('handles an invalid (too large) tensor input', async () => {
      vi.mocked(hasValidChannels).mockReturnValue(true);
      const input = tf.tensor([[[[[1,],],],],]);
      await expect(() => getImageAsTensor(tf, input as tf.Tensor3D))
        .rejects
        .toThrow(getInvalidTensorError(input));
    });

    it('handles invalid input', async () => {
      await expect(() => getImageAsTensor(tf, 123 as any))
        .rejects
        .toThrow(getInvalidInput(123));
    });

    it('handles an invalid file path', async () => {
      vi.mocked(readFileSync).mockImplementation((filename) => {
        throw new Error(`no such file or directory, open ${filename}`);
      })
      const filename = 'foo';
      await expect(() => getImageAsTensor(tf, filename))
        .rejects
        .toThrow(getInvalidImageSrcInput(filename));
    });
  });
});

describe('tensorAsBase64', () => {
  it('returns a tensor as base64', () => {
    const t: tf.Tensor3D = tf.ones([2,2,3]);
    expect(tensorAsBase64(tf, t)).toEqual('AQEB/wEBAf8BAQH/AQEB/w==');
  });
});
