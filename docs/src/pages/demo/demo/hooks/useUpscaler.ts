import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import Upscaler, { AbortError, MultiArgProgress } from 'upscaler';
import { resizeImage } from '../utils/resizeImage';
import { spliceImage } from '../utils/spliceImage';
import { tensorAsImage } from '../utils/tensorAsImage';
import { spliceTensor } from '../utils/spliceTensor';

const PATCH_SIZE = 32;
const SCALE = 4;

const upscaler = new Upscaler({
  warmupSizes: [{ patchSize: PATCH_SIZE }],
});

export const useUpscaler = (img?: HTMLImageElement) => {
  const [upscaling, setUpscaling] = useState(false);
  const [progress, setProgress] = useState(0);

  const upscaledSrc = useRef<string>();
  const upscaledTensor = useRef<tf.Tensor3D>();

  const setUpscaledSrc = useCallback((newSrc: string) => {
    upscaledSrc.current = newSrc;
  }, [upscaledSrc]);
  const setUpscaledTensor = useCallback((newTensor: tf.Tensor3D) => {
    upscaledTensor.current = newTensor;
    setUpscaledSrc(tensorAsImage(newTensor));
  }, [upscaledTensor]);

  const progressCallback = useCallback<MultiArgProgress<'tensor'>>(async (rate: number, slice: tf.Tensor3D) => {
    setProgress(rate);
    if (upscaledTensor.current) {
      setUpscaledTensor(spliceTensor(upscaledTensor.current, slice, 0, 0));
    }
  }, [setProgress]);

  const upscale = useCallback(async (img: HTMLImageElement) => {
    setUpscaledTensor(tf.image.resizeBilinear(tf.browser.fromPixels(img), [img.height * SCALE, img.width * SCALE]));
    setUpscaling(true);
    try {
      const finalTensor = await upscaler.upscale(img, {
        output: 'tensor',
        patchSize: PATCH_SIZE,
        padding: 2,
        progress: (rate, slice) => {
          setProgress(rate);
          if (upscaledTensor.current) {
            setUpscaledTensor(spliceTensor(upscaledTensor.current, slice as unknown as tf.Tensor3D, 0, 0));
          }
        }
      });
      setUpscaledTensor(finalTensor);
    } catch(err) {
      if (!(err instanceof AbortError)) {
        throw err;
      }
    }
    setUpscaling(false);
  }, [setUpscaling, setProgress]);

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
