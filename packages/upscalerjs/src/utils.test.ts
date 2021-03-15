import * as tf from '@tensorflow/tfjs';
import { isString, isHTMLImageElement, isFourDimensionalTensor } from './utils';

describe('isString', () => {
  it('returns true for a string', () => {
    expect(isString('foo')).toEqual(true);
  });

  it('returns false for a non-string', () => {
    expect(isString({})).toEqual(false);
  });
});

describe('isHTMLImageElement', () => {
  it('returns false for a non HTMLImageElement', () => {
    expect(isHTMLImageElement('foo')).toEqual(false);
  });
});

describe('isFourDimensionalTensor', () => {
  it('returns true if a 4d tensor', () => {
    expect(isFourDimensionalTensor(tf.tensor([[[[1]]]]))).toEqual(true);
  });

  it('returns false for a 3d tensor', () => {
    expect(isFourDimensionalTensor(tf.tensor([[[1]]]))).toEqual(false);
  });
});
