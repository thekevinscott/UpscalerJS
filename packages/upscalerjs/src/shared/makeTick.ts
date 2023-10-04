import { YieldedIntermediaryValue, } from './types';
import { isAborted, } from './utils';
import { isTensor, TF, } from '@upscalerjs/core';
import { AbortError, } from './errors-and-warnings';

type TickFunction = (result?: YieldedIntermediaryValue) => Promise<void>;
export const makeTick = (tf: TF, signal: AbortSignal, awaitNextFrame?: boolean): TickFunction => async result => {
  if (awaitNextFrame) {
    await tf.nextFrame();
  }
  if (isAborted(signal)) {
    // only dispose tensor if we are aborting; if aborted, the called function will have
    // no opportunity to dispose of its memory
    if (Array.isArray(result)) {
      result.forEach(r => r?.dispose());
    } else if (isTensor(result)) {
      result.dispose();
    }
    throw new AbortError();
  }
};
