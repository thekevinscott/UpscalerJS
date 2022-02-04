import { JSDOM } from 'jsdom';
import { getImageAsPixels, getInvalidTensorError } from './image.browser';
import * as tf from '@tensorflow/tfjs';
jest.mock('@tensorflow/tfjs', () => {
  const tf = jest.requireActual('@tensorflow/tfjs');
  return {
    ...tf,
    browser: {
      ...tf.browser,
      fromPixels: () => {
        return {
          expandDims: () => {
            return tf.tensor([1]);
          }
        };
      }
    }
  }
});
import * as utils from './utils';
jest.mock('./utils', () => {
  const utils = jest.requireActual('./utils');
  return {
    ...utils,
  }
});
const mockedUtils = utils as jest.Mocked<typeof utils>;

const { window } = new JSDOM('', { resources: 'usable' });
global.Image = window.Image;
global.HTMLImageElement = window.HTMLImageElement;
const origSrc = Object.getOwnPropertyDescriptor(Image.prototype, 'src');

if (origSrc === undefined) {
  throw new Error('Could not get property descriptor for Image prototype');
}

jest.setTimeout(1000);

describe('Image', () => {

  describe('getImageAsPixels', () => {
    afterEach(() => {
      Object.defineProperty(global.Image.prototype, 'src', origSrc);
      (mockedUtils as any).clearMocks();
    })

    it('loads an Image() if given a string as input', async () => {
      const mockSet = jest.fn((_this) => setTimeout(() => _this.onload()))
      Object.defineProperty(global.Image.prototype, 'src', {
        set() {
          return mockSet(this);
        },
      });
      (mockedUtils as any).isFourDimensionalTensor = () => true;
      const result = await getImageAsPixels('foobar');
      expect(mockSet).toHaveBeenCalledTimes(1);
      expect(result.canDispose).toEqual(true);
    });

    it('handles a rejected Image() if given a string as input', async () => {
      const error = 'some error';
      const mockSet = jest.fn((_this) => setTimeout(() => _this.onerror(new Error(error))))
      Object.defineProperty(global.Image.prototype, 'src', {
        set() {
          return mockSet(this);
        },
      });
      await expect(() => getImageAsPixels('foobar'))
        .rejects
        .toThrow(error);
      expect(mockSet).toHaveBeenCalledTimes(1);
    });
  });

  it('reads a given Image() directly', async () => {
    const img = new Image();
    img.src = 'foobar';
    img.crossOrigin = 'anonymous';
    const mockSet = jest.fn((_this) => setTimeout(() => _this.onload()))
    Object.defineProperty(global.Image.prototype, 'src', {
      set() {
        return mockSet(this);
      },
    });
    const result = await getImageAsPixels(img);
    expect(mockSet).toHaveBeenCalledTimes(0);
    expect(result.canDispose).toEqual(true);
  });

  it('reads a rank 4 tensor directly without manipulation', async () => {
    const input: tf.Tensor4D = tf.tensor([[[[1]]]]);
    const mockSet = jest.fn((_this) => setTimeout(() => _this.onload()))
    Object.defineProperty(global.Image.prototype, 'src', {
      set() {
        return mockSet(this);
      },
    });
    const result = await getImageAsPixels(input);
    expect(mockSet).toHaveBeenCalledTimes(0);
    expect(result.canDispose).toEqual(false);
    expect(result.tensor).toBe(input);
    expect(result.tensor.shape).toEqual([1,1,1,1]);
  });

  it('reads a rank 3 tensor and expands to rank 4', async () => {
    const input: tf.Tensor3D = tf.tensor([[[1]]]);
    const mockSet = jest.fn((_this) => setTimeout(() => _this.onload()))
    Object.defineProperty(global.Image.prototype, 'src', {
      set() {
        return mockSet(this);
      },
    });
    const result = await getImageAsPixels(input);
    expect(mockSet).toHaveBeenCalledTimes(0);
    expect(result.canDispose).toEqual(true);
    expect(result.tensor.shape).toEqual([1,1,1,1]);
  });

  it('handles an invalid (too small) tensor input', async () => {
    const input = tf.tensor([[1]]);
    await expect(() => getImageAsPixels(input as any))
      .rejects
      .toThrow(getInvalidTensorError(input))
  });

  it('handles an invalid (too large) tensor input', async () => {
    const input = tf.tensor([[[[[1]]]]]);
    await expect(() => getImageAsPixels(input as any))
      .rejects
      .toThrow(getInvalidTensorError(input))
  });
});
