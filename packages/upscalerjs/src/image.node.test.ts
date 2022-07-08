import fs from 'fs';
import * as http from 'http';
import path from 'path';
import { getImageAsTensor, getInvalidTensorError, } from './image.node';
import { tf } from './dependencies.generated';
import { startServer } from '../../../test/lib/shared/server';

jest.setTimeout(1000);

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

describe('Image', () => {
  let server: http.Server;
  beforeAll(async () => {
    server = await startServer(PORT, FIXTURES);
  })
  afterAll(async () => {
    await stopServer(server);
  })
  describe('getImageAsTensor', () => {
    it('handles a uint array', async () => {
      const FLOWER = path.resolve(FIXTURES, 'flower-small.png');
      const image = new Uint8Array(fs.readFileSync(FLOWER));
      const result = await getImageAsTensor(image);
      expect(result.shape).toEqual([1,16,16,4,]);
    });

    it('handles a buffer', async () => {
      const FLOWER = path.resolve(FIXTURES, 'flower-small.png');
      const image = fs.readFileSync(FLOWER);
      const result = await getImageAsTensor(image);
      expect(result.shape).toEqual([1,16,16,4,]);
    });

    it('handles a local string path to a file', async () => {
      const FLOWER = path.resolve(FIXTURES, 'flower-small.png');
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
  });
});
