import { readFileSync as _readFileSync } from 'fs';
import path from 'path';
import { 
  getImageAsTensor, 
  getInvalidInput,
  tensorAsBase64,
  getInvalidTensorError,
  getInvalidImageSrcInput,
} from './image.node';
import { mockFn } from './mockers';
import { tf } from './dependencies.generated';
import {
  hasValidChannels as _hasValidChannels,
} from '@upscalerjs/core'
jest.mock('@upscalerjs/core', () => {
  const { hasValidChannels, ...rest } = jest.requireActual('@upscalerjs/core');
  return { 
    ...rest,
    hasValidChannels: jest.fn(hasValidChannels),
  }
});
jest.mock('fs', () => {
  const { readFileSync, ...rest } = jest.requireActual('fs');
  return { 
    ...rest,
    readFileSync: jest.fn(readFileSync),
  }
});

const hasValidChannels = mockFn(_hasValidChannels);

jest.setTimeout(1000);

const readFileSync = mockFn(_readFileSync);

// const PORT = 8099;

const getTensorRange = (width: number, height: number): tf.Tensor1D => tf.tidy(() => tf.range(1, 1 + (width * height), 1));
const getTensor = (height: number, width: number): tf.Tensor3D => tf.tidy(() => getTensorRange(width, height).reshape([height, width, 1]).tile([1, 1, 3]));

// const stopServer = (server: http.Server): Promise<void | undefined | Error> => new Promise((resolve) => {
//   if (server) {
//     server.close(resolve);
//   } else {
//     console.warn('No server found');
//     resolve();
//   }
// });

const FLOWER = path.resolve('../test/__fixtures__/flower-small.jpg');
const image = readFileSync(FLOWER);

describe('Image', () => {
  // let server: http.Server;
  beforeEach(() => {
    readFileSync.mockClear();
  });
  // beforeAll(async () => {
  //   server = await startServer(PORT);
  // });
  afterEach(() => {
    hasValidChannels.mockClear();
  });
  // afterAll(async () => {
  //   await stopServer(server);
  // });
  describe('getImageAsTensor', () => {
    it('handles a uint array', async () => {
      const result = await getImageAsTensor(image);
      expect(result.shape).toEqual([1,16,16,3,]);
    });

    it('handles a buffer', async () => {
      const result = await getImageAsTensor(image);
      expect(result.shape).toEqual([1,16,16,3,]);
    });

    it('handles a local string path to a file', async () => {
      const result = await getImageAsTensor(FLOWER);
      expect(result.shape).toEqual([1,16,16,3,]);
    });

    it('reads a rank 4 tensor directly without manipulation', async () => {
      const height = 3;
      const width = 2;
      const input = getTensor(height, width).expandDims(0) as tf.Tensor4D;
      const result = await getImageAsTensor(input);
      expect(result.shape).toEqual([1,height, width, 3,]);
    });

    it('reads a rank 3 tensor and expands to rank 4', async () => {
      const height = 3;
      const width = 2;
      const input = getTensor(height, width);
      const result = await getImageAsTensor(input);
      expect(result.shape).toEqual([1,height, width, 3,]);
    });

    it('handles an invalid (too small) tensor input', async () => {
      hasValidChannels.mockReturnValue(true);
      const input = tf.tensor([[1,],]);
      await expect(() => getImageAsTensor(input as any))
        .rejects
        .toThrow(getInvalidTensorError(input));
    });

    it('handles an invalid (too large) tensor input', async () => {
      hasValidChannels.mockReturnValue(true);
      const input = tf.tensor([[[[[1,],],],],]);
      await expect(() => getImageAsTensor(input as tf.Tensor3D))
        .rejects
        .toThrow(getInvalidTensorError(input));
    });

    it('handles invalid input', async () => {
      await expect(() => getImageAsTensor(123 as any))
        .rejects
        .toThrow(getInvalidInput(123));
    });

    it('handles an invalid file path', async () => {
      readFileSync.mockImplementation((filename) => {
        throw new Error(`no such file or directory, open ${filename}`);
      })
      const filename = 'foo';
      await expect(() => getImageAsTensor(filename))
        .rejects
        .toThrow(getInvalidImageSrcInput(filename));
    });
  });
});

describe('tensorAsBase64', () => {
  it('returns a tensor as base64', () => {
    const t: tf.Tensor3D = tf.ones([2,2,3]);
    expect(tensorAsBase64(t)).toEqual('AQEB/wEBAf8BAQH/AQEB/w==');
  });
});
