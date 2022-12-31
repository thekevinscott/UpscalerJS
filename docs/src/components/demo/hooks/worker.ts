import Upscaler, { AbortError } from 'upscaler';
import model from '@upscalerjs/esrgan-medium/4x';
import * as tf from '@tensorflow/tfjs';

export enum ReceiverWorkerState {
  INSTANTIATE,
  UPSCALE,
  ABORT,
  SET_ID,
}

export enum SenderWorkerState {
  PROGRESS,
  SEND_CONSTS,
}

let upscaler: Upscaler;
let id: string;

let scale: number;
const PATCH_SIZE = 32;
let resolver = () => {};
let ready = new Promise<void>(r => {
  resolver = r;
});

onmessage = async ({ data: { type, data } }) => {
  if (type === ReceiverWorkerState.INSTANTIATE) {
    if (!upscaler) {
      upscaler = new Upscaler({
        model,
      });
      const { modelDefinition } = await upscaler.getModel();
      scale = modelDefinition.scale;
      await upscaler.warmup([{ patchSize: PATCH_SIZE }]); // skipcq: js-0032
      resolver();
      postMessage({
        type: SenderWorkerState.SEND_CONSTS,
        data: {
          scale,
          patchSize: PATCH_SIZE,
        },
      });
      console.log('UpscalerJS warmup complete.');
    } else {
      console.warn('Was asked to instantiate UpscalerJS, but it already exists.')
    }
  } else if (type === ReceiverWorkerState.SET_ID) {
    try {
    upscaler.abort();
    } catch(err) {
      // empty
    }
      if (!data) {
        throw new Error('No data in set id');
      }
    id = data.id;
  } else if (type === ReceiverWorkerState.UPSCALE) {
    await ready;
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
        progress: (rate, slice, row, col) => {
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

