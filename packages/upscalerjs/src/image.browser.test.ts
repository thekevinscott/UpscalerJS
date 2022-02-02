import { JSDOM } from 'jsdom';
import { getImageAsPixels, getUnknownError, getInvalidTensorError } from './image';
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
import { isTensor } from './utils';


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
    })

    it('loads an Image() if given a string as input', async () => {
      const mockSet = jest.fn((_this) => setTimeout(() => _this.onload()))
      Object.defineProperty(global.Image.prototype, 'src', {
        set() {
          return mockSet(this);
        },
      });
      const result = await getImageAsPixels('foobar');
      expect(mockSet).toHaveBeenCalledTimes(1);
      expect(result.type).toEqual('string')
      expect(isTensor(result.tensor)).toBe(true);
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
    expect(result.type).toEqual('HTMLImageElement');
    expect(isTensor(result.tensor)).toBe(true);
  });

  it('reads a rank 4 tensor directly without manipulation', async () => {
    const input = tf.tensor([[[[1]]]]);
    const mockSet = jest.fn((_this) => setTimeout(() => _this.onload()))
    Object.defineProperty(global.Image.prototype, 'src', {
      set() {
        return mockSet(this);
      },
    });
    const result = await getImageAsPixels(input);
    expect(mockSet).toHaveBeenCalledTimes(0);
    expect(result.type).toEqual('tensor');
    expect(result.tensor).toBe(input);
    expect(result.tensor.shape).toEqual([1,1,1,1]);
  });

  it('reads a rank 3 tensor and expands to rank 4', async () => {
    const input = tf.tensor([[[1]]]);
    const mockSet = jest.fn((_this) => setTimeout(() => _this.onload()))
    Object.defineProperty(global.Image.prototype, 'src', {
      set() {
        return mockSet(this);
      },
    });
    const result = await getImageAsPixels(input);
    expect(mockSet).toHaveBeenCalledTimes(0);
    expect(result.type).toEqual('tensor');
    expect(result.tensor.shape).toEqual([1,1,1,1]);
  });

  it('handles an invalid input', async () => {
    await expect(() => getImageAsPixels({} as any))
      .rejects
      .toThrow(getUnknownError({}))
  });

  it('handles an invalid (too small) tensor input', async () => {
    const input = tf.tensor([[1]]);
    await expect(() => getImageAsPixels(input))
      .rejects
      .toThrow(getInvalidTensorError(input))
  });

  it('handles an invalid (too large) tensor input', async () => {
    const input = tf.tensor([[[[[1]]]]]);
    await expect(() => getImageAsPixels(input))
      .rejects
      .toThrow(getInvalidTensorError(input))
  });
});
