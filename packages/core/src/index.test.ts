import * as tfn from '@tensorflow/tfjs-node';
import { 
  makeIsNDimensionalTensor,
  isFourDimensionalTensor, 
  isThreeDimensionalTensor, 
} from './index';

jest.mock('@tensorflow/tfjs', () => ({
  ...(jest.requireActual('@tensorflow/tfjs') ),
  serialization: {
    registerClass: jest.fn(),
  },
}));

describe('makeIsNDimensionalTensor', () => {
  it('checks for a 1-dimensional tensor', () => {
    const fn = makeIsNDimensionalTensor<tfn.Tensor1D>(1);
    expect(fn(tfn.tensor([1]))).toEqual(true);
    expect(fn(tfn.tensor([[1]]))).toEqual(false);
  });

  it('checks for a 2-dimensional tensor', () => {
    const fn = makeIsNDimensionalTensor<tfn.Tensor2D>(2);
    expect(fn(tfn.tensor([1]))).toEqual(false);
    expect(fn(tfn.tensor([[1]]))).toEqual(true);
  });
});

describe('isFourDimensionalTensor', () => {
  it('returns true if a 4d tensor', () => {
    expect(isFourDimensionalTensor(tfn.tensor([[[[1,],],],]))).toEqual(true);
  });

  it('returns false for a 3d tensor', () => {
    expect(isFourDimensionalTensor(tfn.tensor([[[1,],],]))).toEqual(false);
  });

    expect(isFourDimensionalTensor({} as any)).toEqual(false);
});

describe('isThreeDimensionalTensor', () => {
  it('returns true if a 3d tensor', () => {
    expect(isThreeDimensionalTensor(tfn.tensor([[[1,],],]))).toEqual(true);
  });

  it('returns false for a 4d tensor', () => {
    expect(isThreeDimensionalTensor(tfn.tensor([[[[1,],],],]))).toEqual(false);
  });

  it('defensively handles invalid input', () => {
    expect(isThreeDimensionalTensor({} as any)).toEqual(false);
  });
});
