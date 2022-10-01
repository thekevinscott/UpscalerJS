import Upscaler, { AbortError } from 'upscaler';
import * as tf from '@tensorflow/tfjs';

export enum ReceiverWorkerState {
  INSTANTIATE,
  UPSCALE,
  ABORT,
  BENCHMARK,
  BENCHMARK_STOP,
  SET_ID,
}

export enum SenderWorkerState {
  PROGRESS,
  BENCHMARK_START_MEASUREMENT,
  BENCHMARK_COMPLETE_MEASUREMENT,
  BENCHMARK_COMPLETE,
}

let upscaler: Upscaler;
let id: string;
let allowBenchmarking = true;

const timesToTry = 3;

const BENCHMARK_TIME_THRESHOLD = 100;
const MINIMUM_NUMBER_OF_BENCHMARKS = 4;

onmessage = async ({ data: { type, data } }) => {
  if (type === ReceiverWorkerState.INSTANTIATE) {
    if (!upscaler) {
      upscaler = new Upscaler();
      id = data.id;
      const durations = {};
      for (let i = 0; i < data.patchSizes.length; i++) {
        if (allowBenchmarking) {
          const patchSize = data.patchSizes[i];
          postMessage({
            type: SenderWorkerState.BENCHMARK_START_MEASUREMENT,
            data: {
              patchSize,
            },
          });
          // first, _actually_ warm up the model
          await upscaler.warmup([{ patchSize }]); // skipcq: js-0032
          durations[patchSize] = [];
          for (let j = 0; j < timesToTry; j++) {
            const start = performance.now();
            // then, time how long an operation takes
            await upscaler.warmup([{ patchSize }]); // skipcq: js-0032
            durations[patchSize].push(performance.now() - start);
          }
          durations[patchSize] = durations[patchSize].reduce((s, d) => s + d, 0) / timesToTry;
          if (durations[patchSize] > BENCHMARK_TIME_THRESHOLD && Object.keys(durations).length >= MINIMUM_NUMBER_OF_BENCHMARKS) {
            allowBenchmarking = false;
          }
          postMessage({
            type: SenderWorkerState.BENCHMARK_COMPLETE_MEASUREMENT,
            data: {
              patchSize,
              duration: Math.round(durations[patchSize]),
            },
          });
        } else {
          break;
        }
      }
      postMessage({
        type: SenderWorkerState.BENCHMARK_COMPLETE,
        data: {
          durations,
        },
      });
    } else {
      console.warn('Was asked to instantiate UpscalerJS, but it already exists.')
    }
  } else if (type === ReceiverWorkerState.BENCHMARK_STOP) {
    allowBenchmarking = false;
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

