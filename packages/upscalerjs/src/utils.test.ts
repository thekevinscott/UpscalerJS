import * as tf from '@tensorflow/tfjs';
import { isSingleArgProgress, isMultiArgProgress, isString, isFourDimensionalTensor, isThreeDimensionalTensor, isTensor, } from './utils';

describe('isSingleArgProgress', () => {
  it('returns true for function', () => {
    expect(isSingleArgProgress(() => {})).toEqual(true);
  });

  it('returns true for a single arg function', () => {
    expect(isSingleArgProgress((_1: any) => {})).toEqual(false);
  });

  it('returns false for a double arg function', () => {
    expect(isSingleArgProgress((_1: any, _2: any) => {})).toEqual(true);
  });
});

describe('isMultiArgProgress', () => {
  it('returns true for a multi arg function', () => {
    expect(isMultiArgProgress((_1: any, _2: any) => {})).toEqual(true);
  });

  it('returns false for a single arg function', () => {
    expect(isMultiArgProgress((_1: any) => {})).toEqual(false);
  });

  it('returns false for a zero arg function', () => {
    expect(isMultiArgProgress(() => {})).toEqual(false);
  });
});

describe('isString', () => {
  it('returns true for a string', () => {
    expect(isString('foo')).toEqual(true);
  });

  it('returns false for a non-string', () => {
    expect(isString({} as any)).toEqual(false);
  });
});

describe('isFourDimensionalTensor', () => {
  it('returns true if a 4d tensor', () => {
    expect(isFourDimensionalTensor(tf.tensor([[[[1,],],],]))).toEqual(true);
  });

  it('returns false for a 3d tensor', () => {
    expect(isFourDimensionalTensor(tf.tensor([[[1,],],]))).toEqual(false);
  });

    expect(isFourDimensionalTensor({} as any)).toEqual(false);
});

describe('isThreeDimensionalTensor', () => {
  it('returns true if a 3d tensor', () => {
    expect(isThreeDimensionalTensor(tf.tensor([[[1,],],]))).toEqual(true);
  });

  it('returns false for a 4d tensor', () => {
    expect(isThreeDimensionalTensor(tf.tensor([[[[1,],],],]))).toEqual(false);
  });

  it('defensively handles invalid input', () => {
    expect(isThreeDimensionalTensor({} as any)).toEqual(false);
  });
});

describe('isTensor', () => {
  it('returns true if a tensor', () => {
    expect(isTensor(tf.tensor([[1,],]))).toEqual(true);
  });
  it('returns false if not a tensor', () => {
    expect(isTensor([] as any)).toEqual(false);
  });
});
