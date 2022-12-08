import Upscaler, { AbortError } from 'upscaler';
import * as tf from '@tensorflow/tfjs';

export enum ReceiverWorkerState {
  INSTANTIATE,
  UPSCALE,
  ABORT,
  SET_ID,
}

export enum SenderWorkerState {
  PROGRESS,
}

let upscaler: Upscaler;
let id: string;

const PATCH_SIZE = 64;

onmessage = async ({ data: { type, data } }) => {
  if (type === ReceiverWorkerState.INSTANTIATE) {
    if (!upscaler) {
      upscaler = new Upscaler();
      await upscaler.warmup([{ patchSize: PATCH_SIZE }]); // skipcq: js-0032
      id = data.id;
    } else {
      console.warn('Was asked to instantiate UpscalerJS, but it already exists.')
    }
  } else if (type === ReceiverWorkerState.SET_ID) {
    try {
    upscaler.abort();
    } catch(err) {
      // empty
    }
    id = data.id;
  } else if (type === ReceiverWorkerState.UPSCALE) {
    if (!upscaler) {
      throw new Error('Instantiate an Upscaler first.')
    }
    const {
      pixels,
      shape,
      patchSize,
      padding,
    } = data;
    const input = tf.tensor3d(pixels, shape);
    try {
      await upscaler.upscale(input, {
        output: 'tensor',
        patchSize,
        padding,
        progress: (rate, _slice, row, col) => {
          const slice = _slice as unknown as tf.Tensor;
          postMessage({
            type: SenderWorkerState.PROGRESS,
            data: {
              id,
              rate,
              row,
              col,
              slice: slice.dataSync(),
              shape: slice.shape,
            },
          });
          slice.dispose();
        }
      });
    } catch (err) {
      if (!(err instanceof AbortError)) {
        throw err;
      }
     }
    input.dispose();
  } else if (type === ReceiverWorkerState.ABORT) {
    try { upscaler.abort(); } catch(err) {
      // empty
    }
  }
}

