import { useCallback, useEffect, useRef, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import { useCanvas } from './useCanvas';
import { ReceiverWorkerState, SenderWorkerState } from './worker';
import { tensorAsBase64 } from 'tensor-as-base64';

export const useUpscaler = (img?: HTMLImageElement) => {
  const [scale, setScale] = useState<number>();
  const [patchSize, setPatchSize] = useState<number>();
  const [upscaling, setUpscaling] = useState(false);
  const [progress, setProgress] = useState<number>();

  const upscaledSrc = useRef<string>();

  const { drawImage, createCanvas } = useCanvas();

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
            setUpscaledSrc(await drawImage(dataURL, patchSize * scale, col, row));
            if (rate === 1) {
              setUpscaling(false);
            }
          }
        } else {
          console.warn('Received progress event, but we are not supposed to be upscaling.');
        }
      } else if (type === SenderWorkerState.SEND_CONSTS) {
        setScale(data.scale);
        setPatchSize(data.patchSize);
      }
    }
  }, [upscaling, img, setProgress, setUpscaledSrc,]);

  const upscale = useCallback(async (_img: HTMLImageElement, scale?: number, patchSize?: number) => {
    if (!scale) {
      throw new Error('Scale is not defined');
    }
    setUpscaledSrc(createCanvas(_img, scale));
    setProgress(0);
    setUpscaling(true);
    const src = tf.browser.fromPixels(_img);
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
  }, [scale, createCanvas, setUpscaling, setProgress]);

  const cancelUpscale = useCallback(() => {
    worker.current.postMessage({
      type: ReceiverWorkerState.ABORT,
    });
    setUpscaling(false);
    setProgress(undefined);
  }, [setUpscaling, worker]);

  useEffect(() => {
    if (img && scale && patchSize) {
      upscale(img, scale, patchSize);
    } else {
      upscaledSrc.current = undefined;
    }
  }, [img, upscale, scale, patchSize]);

  return {
    cancelUpscale,
    upscaledSrc: upscaledSrc.current,
    progress: upscaling ? progress : undefined,
    scale,
  }
}
