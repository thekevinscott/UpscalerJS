import * as tf from '@tensorflow/tfjs-node';
import { 
  isTensor as _isTensor, 
} from '@upscalerjs/core';
import { 
  AbortError,
} from './errors-and-warnings';
import { makeTick } from './makeTick';
import { mockFn } from '../../../test/lib/shared/mockers';

const isTensor = mockFn(_isTensor);

jest.mock('@upscalerjs/core', () => {
  const { isTensor, ...rest} = jest.requireActual('@upscalerjs/core');
  return {
    ...rest,
    isTensor: jest.fn(isTensor),
  };
});

describe('makeTick', () => {
  it('disposes of an in-flight tensor', (done) => {
    isTensor.mockImplementation(() => true);
    const abortController = new AbortController();
    const dispose = jest.fn();
    const t = {
      dispose,
    } as unknown as tf.Tensor3D;
    const tick = makeTick(abortController.signal, true);
    tick(t).then(() => {
      throw new Error('Should have thrown.');
    }).catch(err => {
      expect(dispose).toHaveBeenCalled();
      expect(err instanceof AbortError).toBe(true);
      done();
    });
    abortController.abort();
  }, 100);

  it('disposes of a multiple in-flight tensors', (done) => {
    isTensor.mockImplementation(() => false);
    const abortController = new AbortController();
    const dispose = jest.fn();
    const getTensor = () => ({
      dispose,
    }) as unknown as tf.Tensor3D;
    const mockTensors = Array(3).fill('').map(() => getTensor());
    const tick = makeTick(abortController.signal, true);
    tick(mockTensors).then(() => {
      throw new Error('Should have thrown.');
    }).catch(err => {
      mockTensors.forEach(t => {
        expect(t.dispose).toHaveBeenCalled();
      });
      expect(err instanceof AbortError).toBe(true);
      done();
    });
    abortController.abort();
  }, 100);

  it('ignores any non-tensor results', (done) => {
    isTensor.mockImplementation(() => false);
    const abortController = new AbortController();
    const tick = makeTick(abortController.signal, true);
    tick(undefined).then(() => {
      throw new Error('Should have thrown.');
    }).catch(err => {
      expect(err instanceof AbortError).toBe(true);
      done();
    });
    abortController.abort();
  }, 100);
});
