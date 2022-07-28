import { readFileSync as _readFileSync } from 'fs';
import http from 'http';
import path from 'path';
import { 
  getImageAsTensor, 
  getInvalidInput,
  tensorAsBase64,
  getInvalidTensorError,
  getInvalidImageSrcInput,
} from './image.node';
import { mockFn } from '../../../test/lib/shared/mockers';
import { tf } from './dependencies.generated';
import { startServer } from '../../../test/lib/shared/server';
jest.mock('fs', () => {
  const { readFileSync, ...rest } = jest.requireActual('fs');
  return { 
    ...rest,
    readFileSync: jest.fn(readFileSync),
  }
});

jest.setTimeout(1000);

const readFileSync = mockFn(_readFileSync);

const SRC = path.resolve(__dirname);
const FIXTURES = path.resolve(SRC, '../../../test/__fixtures__');
const PORT = 8099;

const stopServer = (server: http.Server): Promise<void | undefined | Error> => new Promise((resolve) => {
  if (server) {
    server.close(resolve);
  } else {
    console.warn('No server found');
    resolve();
  }
});

const FLOWER = path.resolve(FIXTURES, 'flower-small.png');
const image = readFileSync(FLOWER);

describe('Image', () => {
  let server: http.Server;
  beforeEach(() => {
    readFileSync.mockClear();
  })
  beforeAll(async () => {
    server = await startServer(PORT, FIXTURES);
  })
  afterAll(async () => {
    await stopServer(server);
  })
  describe('getImageAsTensor', () => {
    it('handles a uint array', async () => {
      const result = await getImageAsTensor(image);
      expect(result.shape).toEqual([1,16,16,4,]);
    });

    it('handles a buffer', async () => {
      const result = await getImageAsTensor(image);
      expect(result.shape).toEqual([1,16,16,4,]);
    });

    it('handles a local string path to a file', async () => {
      const result = await getImageAsTensor(FLOWER);
      expect(result.shape).toEqual([1,16,16,4,]);
    });

    it('reads a rank 4 tensor directly without manipulation', async () => {
      const input: tf.Tensor4D = tf.tensor([[[[1,],],],]);
      const result = await getImageAsTensor(input);
      expect(result.shape).toEqual([1,1,1,1,]);
    });

    it('reads a rank 3 tensor and expands to rank 4', async () => {
      const input: tf.Tensor3D = tf.tensor([[[1,],],]);
      const result = await getImageAsTensor(input);
      expect(result.shape).toEqual([1,1,1,1,]);
    });

    it('handles an invalid (too small) tensor input', async () => {
      const input = tf.tensor([[1,],]);
      await expect(() => getImageAsTensor(input as tf.Tensor3D))
        .rejects
        .toThrow(getInvalidTensorError(input));
    });

    it('handles an invalid (too large) tensor input', async () => {
      const input = tf.tensor([[[[[1,],],],],]);
      await expect(() => getImageAsTensor(input as tf.Tensor3D))
        .rejects
        .toThrow(getInvalidTensorError(input));
    });

    it('handles invalid input', async () => {
      await expect(() => getImageAsTensor(123 as unknown as tf.Tensor3D))
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
