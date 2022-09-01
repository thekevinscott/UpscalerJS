import { useCallback, useEffect, useRef, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import { AbortError } from 'upscaler';
import { useCanvas } from './useCanvas';
import { ReceiverWorkerState, SenderWorkerState } from './worker';
import { tensorAsBase64 } from '@site/../packages/upscalerjs/dist/browser/esm/image.generated';

const SCALE = 4;

const PATCH_SIZES = [
  4,
  6,
  8,
  10,
  12,
  14,
  16,
  24,
  32,
  48,
  64,
  96,
  128,
  256,
  512,
  1024,
];

export const useUpscaler = (img?: HTMLImageElement) => {
  const [upscaling, setUpscaling] = useState(false);
  const [progress, setProgress] = useState<number>();
  const [hasBeenBenchmarked, setHasBeenBenchmarked] = useState(false);

  const upscaledSrc = useRef<string>();

  const { drawImage, createCanvas } = useCanvas(SCALE);
  const [benchmarks, setBenchmarks] = useState<Record<number, undefined | number>>();

  const setUpscaledSrc = useCallback((newSrc: string) => {
    upscaledSrc.current = newSrc;
  }, []);

  const [patchSize, setPatchSize] = useState<number>();

  const worker = useRef<Worker>();

  useEffect(() => {
    worker.current = new Worker(new URL('worker.ts', import.meta.url));
    worker.current.postMessage({
      type: ReceiverWorkerState.INSTANTIATE,
      data: {
        patchSizes: PATCH_SIZES,
      }
    });

    return () => {
      worker.current.terminate();
    }
  }, []);

  useEffect(() => {
    worker.current.postMessage({
      type: ReceiverWorkerState.SET_ID,
      data: {
        id: img?.src,
      }
    });

    worker.current.onmessage = async ({ data: { type, data } }) => {
      if (type === SenderWorkerState.BENCHMARK_START_MEASUREMENT) {
        const {
          patchSize: _patchSize,
        } = data;
        setBenchmarks(prev => ({
          ...prev,
          [_patchSize]: undefined,
        }));
      }
      if (type === SenderWorkerState.BENCHMARK_COMPLETE_MEASUREMENT) {
        const {
          patchSize: _patchSize,
          duration,
        } = data;
        setBenchmarks(prev => ({
          ...prev,
          [_patchSize]: duration,
        }));
      }
      if (type === SenderWorkerState.BENCHMARK_COMPLETE) {
        const {
          durations,
        } = data;
        const durationKeys = Object.keys(durations).map(k => parseInt(k, 10));
        let maximumAllowedPatchSize = durationKeys[0];
        for (let i = 0; i < durationKeys.length; i++) {
          const key = durationKeys[i];
          if (durations[key] < 100) {
            maximumAllowedPatchSize = key;
          } else {
            break;
          }
        }
        setPatchSize(maximumAllowedPatchSize);
        setHasBeenBenchmarked(true);
      }
      if (type === SenderWorkerState.PROGRESS) {
        const {
          id,
          rate,
          row,
          col,
          slice,
          shape,
        } = data;
        if (id === img.src) {
          setProgress(rate);
          const dataURL = tf.tidy(() => tensorAsBase64(tf.tensor3d(slice, shape)));
          setUpscaledSrc(await drawImage(dataURL, patchSize * SCALE, col, row));
          if (rate === 1) {
            setUpscaling(false);
          }
        }
      }
    }
  }, [setBenchmarks, img, patchSize, setProgress, setUpscaledSrc,]);

  const upscale = useCallback(async (img: HTMLImageElement) => {
    setUpscaledSrc(createCanvas(img));
    setProgress(0);
    setUpscaling(true);
    try {
      const src = tf.browser.fromPixels(img);
      await tf.nextFrame();
      worker.current.postMessage({
        type: ReceiverWorkerState.UPSCALE,
        data: {
          pixels: src.dataSync(),
          shape: src.shape,
          patchSize,
          padding: 2,
        }
      });
    } catch(err) {
      if (!(err instanceof AbortError)) {
        throw err;
      }
    }
  }, [patchSize, createCanvas, setUpscaling, setProgress]);

  const cancelUpscale = useCallback(() => {
    try {
      worker.current.postMessage({
        type: ReceiverWorkerState.ABORT,
      });
    } catch(err) {}
    setUpscaling(false);
    setProgress(undefined);
  }, [setUpscaling]);

  useEffect(() => {
    if (img) {
      upscale(img);
    } else {
      upscaledSrc.current = undefined;
    }
  }, [img, upscale]);

  return {
    cancelUpscale,
    upscaledSrc: upscaledSrc.current,
    progress: upscaling ? progress : undefined,
    hasBeenBenchmarked,
    benchmarks,
    patchSize,
    choosePatchSize: setPatchSize,
  }
}
