import * as tf from '@tensorflow/tfjs-node';
import { 
  makeIsNDimensionalTensor,
  isFourDimensionalTensor, 
  isThreeDimensionalTensor, 
  isTensor,
  isString,
  isValidModelDefinition,
  ModelDefinition,
  hasValidChannels,
} from './index';

jest.mock('@tensorflow/tfjs', () => ({
  ...(jest.requireActual('@tensorflow/tfjs') ),
  serialization: {
    registerClass: jest.fn(),
  },
}));

describe('makeIsNDimensionalTensor', () => {
  it('checks for a 1-dimensional tensor', () => {
    const fn = makeIsNDimensionalTensor<tf.Tensor1D>(1);
    expect(fn(tf.tensor([1]))).toEqual(true);
    expect(fn(tf.tensor([[1]]))).toEqual(false);
  });

  it('checks for a 2-dimensional tensor', () => {
    const fn = makeIsNDimensionalTensor<tf.Tensor2D>(2);
    expect(fn(tf.tensor([1]))).toEqual(false);
    expect(fn(tf.tensor([[1]]))).toEqual(true);
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

describe('isString', () => {
  it('returns true for a string', () => {
    expect(isString('foo')).toEqual(true);
  });

  it('returns false for a non-string', () => {
    expect(isString({} as any)).toEqual(false);
  });
});

describe('isValidModelDefinition', () => {
  it('returns false if given an undefined', () => {
    expect(isValidModelDefinition(undefined)).toEqual(false);
  });

  it('returns false if given path but no scale', () => {
    expect(isValidModelDefinition({ path: 'foo', scale: undefined } as unknown as ModelDefinition )).toEqual(false);
  });

  it('returns false if given scale but no path', () => {
    expect(isValidModelDefinition({ path: undefined, scale: 2 } as unknown as ModelDefinition )).toEqual(false);
  });

  it('returns true if given scale and path', () => {
    expect(isValidModelDefinition({ path: 'foo', scale: 2 })).toEqual(true);
  });
});

describe('hasValidChannels', () => {
  it('returns true if a tensor has valid channels', () => {
    expect(hasValidChannels(tf.ones([4,4,3]))).toEqual(true);
  });

  it('returns false if a tensor does not have valid channels', () => {
    expect(hasValidChannels(tf.ones([4,4,4]))).toEqual(false);
  });
});
