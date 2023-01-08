import { useCallback, useEffect, useRef, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import { useCanvas } from './useCanvas';
import { ReceiverWorkerState, SenderWorkerState } from './worker';

export const useUpscaler = (img?: HTMLCanvasElement, id?: string) => {
  const [scale, setScale] = useState<number>();
  const [patchSize, setPatchSize] = useState<number>();
  const [upscaling, setUpscaling] = useState(false);
  const [progress, setProgress] = useState<number>();

  const upscaledRef = useRef<HTMLCanvasElement>();

  const { drawImage, createCanvas } = useCanvas();

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
        id,
      }
    });
  }, [id]);

  useEffect(() => {
    worker.current.onmessage = ({ data: { type, data } }) => {
      if (type === SenderWorkerState.PROGRESS) {
        if (upscaling) {
          const {
            rate,
            row,
            col,
            slice,
            shape,
          } = data;
          if (id === data.id) {
            setProgress(rate);
            drawImage(upscaledRef.current, slice, shape, patchSize * scale, col, row);
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
  }, [upscaling, id, setProgress, ]);

  const upscale = useCallback(async (_img: HTMLCanvasElement, _scale?: number, _patchSize?: number) => {
    if (!_scale) {
      throw new Error('Scale is not defined');
    }
    if (!upscaledRef.current) {
      throw new Error('No canvas available');
    }
    createCanvas(upscaledRef.current, _img, _scale);
    setProgress(0);
    setUpscaling(true);
    const src = await tf.browser.fromPixelsAsync(_img);
    worker.current.postMessage({
      type: ReceiverWorkerState.UPSCALE,
      data: {
        pixels: src.dataSync(),
        shape: src.shape,
        patchSize: _patchSize,
        padding: 2,
      }
    });
  }, [upscaledRef, createCanvas, scale, setUpscaling, setProgress]);

  const cancelUpscale = useCallback(() => {
    worker.current.postMessage({
      type: ReceiverWorkerState.ABORT,
    });
    setUpscaling(false);
    setProgress(undefined);
  }, [setUpscaling, worker]);

  useEffect(() => {
    const canvas = upscaledRef.current;
    if (canvas) {
      if (img && scale && patchSize) {
        upscale(img, scale, patchSize);
      } else {
        const context = canvas.getContext('2d');
        context.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [img, upscale, scale, patchSize, upscaledRef]);

  return {
    cancelUpscale,
    // upscaledSrc: upscaledSrc.current,
    upscaledRef,
    progress: upscaling ? progress : undefined,
    scale,
  }
}
