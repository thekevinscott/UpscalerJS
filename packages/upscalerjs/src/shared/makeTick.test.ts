import { vi, expect, } from 'vitest';
import * as tf from '@tensorflow/tfjs-node';
import { 
  isTensor,
} from '../../../shared/src/constants';
import { 
  AbortError,
} from './errors-and-warnings.js';
import { makeTick } from './makeTick.js';

import type * as sharedConstants from '../../../shared/src/constants';

vi.mock('../../../shared/src/constants', async () => {
  const { isTensor, ...rest} = await vi.importActual('../../../shared/src/constants') as typeof sharedConstants;
  return {
    ...rest,
    isTensor: vi.fn(isTensor),
  };
});

describe('makeTick', () => {
  it('disposes of an in-flight tensor', () => {
    vi.mocked(isTensor).mockImplementation(() => true);
    const abortController = new AbortController();
    const dispose = vi.fn();
    const t = {
      dispose,
    } as unknown as tf.Tensor3D;
    const tick = makeTick(tf, abortController.signal, true);
    const result = tick(t).then(() => {
      expect.unreachable('Should have thrown.')
    }).catch(err => {
      expect(dispose).toHaveBeenCalled();
      expect(err instanceof AbortError).toBe(true);
    });
    abortController.abort();
    return result;
  }, 100);

  it('disposes of a multiple in-flight tensors', () => {
    vi.mocked(isTensor).mockImplementation(() => false);
    const abortController = new AbortController();
    const dispose = vi.fn();
    const getTensor = () => ({
      dispose,
    }) as unknown as tf.Tensor3D;
    const mockTensors = Array(3).fill('').map(() => getTensor());
    const tick = makeTick(tf, abortController.signal, true);
    const result = tick(mockTensors).then(() => {
      expect.unreachable('Should have thrown.')
    }).catch(err => {
      mockTensors.forEach(t => {
        expect(t.dispose).toHaveBeenCalled();
      });
      expect(err instanceof AbortError).toBe(true);
    });
    abortController.abort();
    return result;
  }, 100);

  it('ignores any non-tensor results', () => {
    vi.mocked(isTensor).mockImplementation(() => false);
    const abortController = new AbortController();
    const tick = makeTick(tf, abortController.signal, true);
    const result = tick(undefined).then(() => {
      expect.unreachable('Should have thrown.')
    }).catch(err => {
      expect(err instanceof AbortError).toBe(true);
    });
    abortController.abort();
    return result;
  }, 100);
});
