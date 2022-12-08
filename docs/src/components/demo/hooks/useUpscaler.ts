import { useCallback, useEffect, useRef, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import { useCanvas } from './useCanvas';
import { ReceiverWorkerState, SenderWorkerState } from './worker';

// TODO: This has to manually be set to the scale of the model loaded in the worker.
const SCALE = 4;
const PATCH_SIZE = 64;

export const useUpscaler = (img?: HTMLImageElement) => {
  const [upscaling, setUpscaling] = useState(false);
  const [progress, setProgress] = useState<number>();

  const upscaledSrc = useRef<string>();

  const { createCanvas } = useCanvas(SCALE);

  const setUpscaledSrc = useCallback((newSrc: string) => {
    upscaledSrc.current = newSrc;
  }, []);

  const [patchSize] = useState<number>(PATCH_SIZE);

  const worker = useRef<Worker>();

  const upscale = useCallback(async (img: HTMLImageElement) => {
    setUpscaledSrc(createCanvas(img));
    setProgress(0);
    setUpscaling(true);
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
  }, [patchSize, createCanvas, setUpscaling, setProgress]);

  const cancelUpscale = useCallback(() => {
    worker.current.postMessage({
      type: ReceiverWorkerState.ABORT,
    });
    setUpscaling(false);
    setProgress(undefined);
  }, [setUpscaling, worker]);

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
    scale: SCALE,
  }
}
