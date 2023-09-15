import * as tf from '@tensorflow/tfjs-node';
import { 
  isTensor,
} from '@upscalerjs/core';
import { 
  AbortError,
} from './errors-and-warnings';
import { makeTick } from './makeTick';

import type * as core from '@upscalerjs/core';

vi.mock('@upscalerjs/core', async () => {
  const { isTensor, ...rest} = await vi.importActual('@upscalerjs/core') as typeof core;
  return {
    ...rest,
    isTensor: vi.fn(isTensor),
  };
});

describe('makeTick', () => {
  it('disposes of an in-flight tensor', () => new Promise<void>(done => {
    vi.mocked(isTensor).mockImplementation(() => true);
    const abortController = new AbortController();
    const dispose = vi.fn();
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
  }), 100);

  it('disposes of a multiple in-flight tensors', () => new Promise<void>(done => {
    vi.mocked(isTensor).mockImplementation(() => false);
    const abortController = new AbortController();
    const dispose = vi.fn();
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
  }), 100);

  it('ignores any non-tensor results', () => new Promise<void>(done => {
    vi.mocked(isTensor).mockImplementation(() => false);
    const abortController = new AbortController();
    const tick = makeTick(abortController.signal, true);
    tick(undefined).then(() => {
      throw new Error('Should have thrown.');
    }).catch(err => {
      expect(err instanceof AbortError).toBe(true);
      done();
    });
    abortController.abort();
  }), 100);
});
