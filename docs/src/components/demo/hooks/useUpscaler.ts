import { useCallback, useEffect, useRef, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import { useCanvas } from './useCanvas';
import { ReceiverWorkerState, SenderWorkerState } from './worker';
import { tensorAsBase64 } from 'tensor-as-base64';

// TODO: This has to manually be set to the scale of the model loaded in the worker.
const SCALE = 4;
const PATCH_SIZE = 64;

export const useUpscaler = (img?: HTMLImageElement) => {
  const [upscaling, setUpscaling] = useState(false);
  const [progress, setProgress] = useState<number>();

  const upscaledSrc = useRef<string>();

  const { drawImage, createCanvas } = useCanvas(SCALE);

  const setUpscaledSrc = useCallback((newSrc: string) => {
    upscaledSrc.current = newSrc;
  }, []);

  const worker = useRef<Worker>();

  useEffect(() => {
    worker.current = new Worker(new URL('worker.ts', import.meta.url));
    worker.current.postMessage({
      type: ReceiverWorkerState.INSTANTIATE,
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
  }, [img]);

  useEffect(() => {
    worker.current.onmessage = async ({ data: { type, data } }) => {
      if (type === SenderWorkerState.PROGRESS) {
        if (upscaling) {
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
            const tensor = tf.tensor3d(slice, shape);
            const dataURL = await tensorAsBase64(tensor);
            tensor.dispose();
            setUpscaledSrc(await drawImage(dataURL, PATCH_SIZE * SCALE, col, row));
            if (rate === 1) {
              setUpscaling(false);
            }
          }
        } else {
          console.warn('Received progress event, but we are not supposed to be upscaling.');
        }
      }
    }
  }, [upscaling, img, setProgress, setUpscaledSrc,]);

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
        patchSize: PATCH_SIZE,
        padding: 2,
      }
    });
  }, [createCanvas, setUpscaling, setProgress]);

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
