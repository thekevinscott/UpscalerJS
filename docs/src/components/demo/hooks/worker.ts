import Upscaler, { AbortError, SliceData } from 'upscaler';
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
const PADDING = 2;
let resolver = () => {};
const ready = new Promise<void>(r => {
  resolver = r;
});

const post = (payload: {
  type: SenderWorkerState;
  data: Record<string, string | number | SliceData | Float32Array | Uint8Array | Uint16Array | Int32Array | number[]>;
}) => postMessage(payload); // skipcq: js-s1014

onmessage = async ({ data: { type, data } }) => {
  if (type === ReceiverWorkerState.INSTANTIATE) {
    if (!upscaler) {
      upscaler = new Upscaler({
        model,
      });
      const { modelDefinition } = await upscaler.getModel();
      scale = modelDefinition.scale;
      post({
        type: SenderWorkerState.SEND_CONSTS,
        data: {
          scale,
          patchSize: PATCH_SIZE,
          padding: PADDING,
        },
      });
      await upscaler.warmup([{ patchSize: PATCH_SIZE, padding: PADDING }]); // skipcq: js-0032
      resolver();
      // console.log('UpscalerJS warmup complete.');
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
      await upscaler.execute(input, {
        output: 'tensor',
        patchSize,
        padding,
        progress: (rate, slice, sliceData) => {
          post({
            type: SenderWorkerState.PROGRESS,
            data: {
              id,
              rate,
              sliceData,
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

