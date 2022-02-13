import { getImageAsPixels, getInvalidTensorError, } from './image.node';
import * as tf from '@tensorflow/tfjs-node';
import * as utils from './utils';

jest.setTimeout(1000);

describe('Image', () => {
  describe('getImageAsPixels', () => {
    it('handles a local string path to a file', async () => {
    });
  //   it('handles a string path to an http-hosted file', async () => {
  //   });
  //   it('handles a string path representing a base64 representation of an image', async () => {
  //   });

  //   it('handles a blob', async () => {
  //   });
  //   it('handles a uint array', async () => {
  //   });

  //   it('reads a rank 4 tensor directly without manipulation', async () => {
  //     const input: tf.Tensor4D = tf.tensor([[[[1,],],],]);
  //     const mockSet = jest.fn((_this) => setTimeout(() => _this.onload()));
  //     Object.defineProperty(global.Image.prototype, 'src', {
  //       set() {
  //         return mockSet(this);
  //       },
  //     });
  //     const result = await getImageAsPixels(input);
  //     expect(mockSet).toHaveBeenCalledTimes(0);
  //     expect(result.canDispose).toEqual(false);
  //     expect(result.tensor).toBe(input);
  //     expect(result.tensor.shape).toEqual([1,1,1,1,]);
  //   });

  //   it('reads a rank 3 tensor and expands to rank 4', async () => {
  //     const input: tf.Tensor3D = tf.tensor([[[1,],],]);
  //     const mockSet = jest.fn((_this) => setTimeout(() => _this.onload()));
  //     Object.defineProperty(global.Image.prototype, 'src', {
  //       set() {
  //         return mockSet(this);
  //       },
  //     });
  //     const result = await getImageAsPixels(input);
  //     expect(mockSet).toHaveBeenCalledTimes(0);
  //     expect(result.canDispose).toEqual(true);
  //     expect(result.tensor.shape).toEqual([1,1,1,1,]);
  //   });

  //   it('handles an invalid (too small) tensor input', async () => {
  //     const input = tf.tensor([[1,],]);
  //     await expect(() => getImageAsPixels(input as any))
  //       .rejects
  //       .toThrow(getInvalidTensorError(input));
  //   });

  //   it('handles an invalid (too large) tensor input', async () => {
  //     const input = tf.tensor([[[[[1,],],],],]);
  //     await expect(() => getImageAsPixels(input as any))
  //       .rejects
  //       .toThrow(getInvalidTensorError(input));
  //   });
  // });
});
