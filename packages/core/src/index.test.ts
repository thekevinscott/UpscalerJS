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
  isValidRange,
  isNumber,
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

  it('returns false if given invalid model type', () => {
    expect(isValidModelDefinition({ path: 'foo', scale: 2, modelType: 'foo' } as unknown as ModelDefinition )).toEqual(false);
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

describe('isNumber', () => {
  it('returns true if it gets a number', () => {
    expect(isNumber(1)).toEqual(true);
  });

  it('returns false if a tensor does not have valid channels', () => {
    expect(isNumber('foo')).toEqual(false);
  });
});

describe('isValidRange', () => {
  it('returns false if it gets undefined', () => {
    expect(isValidRange(undefined)).toEqual(false);
  });

  it('returns false if it gets a number', () => {
    expect(isValidRange(1)).toEqual(false);
  });

  it('returns false if it gets a string', () => {
    expect(isValidRange('foo')).toEqual(false);
  });

  it('returns false if it gets an empty array', () => {
    expect(isValidRange([])).toEqual(false);
  });

  it('returns false if it gets an array with one number', () => {
    expect(isValidRange([1])).toEqual(false);
  });

  it('returns false if it gets an array with three numbers', () => {
    expect(isValidRange([1,2,3])).toEqual(false);
  });

  it('returns false if it gets an array with a number and a string', () => {
    expect(isValidRange([1,'foo'])).toEqual(false);
  });

  it('returns true if it gets an array with two numbers', () => {
    expect(isValidRange([1,2])).toEqual(true);
  });
});
