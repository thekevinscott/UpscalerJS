import { useCallback, useEffect, useRef, useState } from 'react';
import Upscaler, { AbortError } from 'upscaler';
import { useCanvas } from './useCanvas';

const PATCH_SIZE = 32;
const SCALE = 4;

const upscaler = new Upscaler({
  warmupSizes: [{ patchSize: PATCH_SIZE }],
});

export const useUpscaler = (img?: HTMLImageElement) => {
  const [upscaling, setUpscaling] = useState(false);
  const [progress, setProgress] = useState(0);

  const upscaledSrc = useRef<string>();

  const { drawImage, createCanvas } = useCanvas(SCALE);

  const setUpscaledSrc = useCallback((newSrc: string) => {
    upscaledSrc.current = newSrc;
  }, []);

  const upscale = useCallback(async (img: HTMLImageElement) => {
    setUpscaledSrc(createCanvas(img));
    setUpscaling(true);
    try {
      const upscaledImage = await upscaler.upscale(img, {
        output: 'base64',
        patchSize: PATCH_SIZE,
        padding: 2,
        progress: async (rate, slice, row, col) => {
          setProgress(rate);
          setUpscaledSrc(await drawImage(slice, PATCH_SIZE * SCALE, col, row));
        }
      });
      // setUpscaledSrc(upscaledImage);
    } catch(err) {
      if (!(err instanceof AbortError)) {
        throw err;
      }
    }
    setUpscaling(false);
  }, [createCanvas, setUpscaling, setProgress]);

  const cancelUpscale = useCallback(() => {
    try {
      upscaler.abort();
    } catch(err) {}
    setUpscaling(false);
    setProgress(0);
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
  }
}
