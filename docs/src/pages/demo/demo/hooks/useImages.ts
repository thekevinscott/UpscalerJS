import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ProcessedImage, Size, UploadedImage, UpscaleChoice } from '../types';
import { getHTMLImageElement } from '../utils/getHTMLImageElement';
import { getRecommendedImageSize } from '../utils/getRecommendedImageSize';
import { resizeImage } from '../utils/resizeImage';
import { useAppropriateImage } from './useAppropriateImage';
import { useUpscaler } from './useUpscaler';

const shouldPromptToResize = (el: HTMLImageElement, recommendedSize: Size) => {
  return recommendedSize.width !== el.width || recommendedSize.height !== el.height;
}

export const useImages = () => {
  const [_originalImage, _setOriginalImage] = useState<ProcessedImage>();
  const [downscaledImage, _setDownscaledImage] = useState<HTMLImageElement>();
  const [hasBeenRescaled, _setHasBeenRescaled] = useState(undefined);

  const [choice, _setChoice] = useState<UpscaleChoice | undefined>();

  const reset = useCallback(() => {
    _setDownscaledImage(undefined);
    _setOriginalImage(undefined);
    _setChoice(undefined);
    _setHasBeenRescaled(false);
  }, [_setOriginalImage, _setDownscaledImage, _setHasBeenRescaled, _setChoice]);

  const setUploadedImage = useCallback(async ({ src, filename }: UploadedImage) => {
    reset();
    const img = await getHTMLImageElement(src);
    _setOriginalImage({
      src,
      filename,
      el: img,
    });
    const recommendedSize = getRecommendedImageSize(img);
    if (shouldPromptToResize(img, recommendedSize)) {
      const downscaledImg = await getHTMLImageElement(resizeImage(img, recommendedSize.width / img.width));
      _setDownscaledImage(downscaledImg);
      _setHasBeenRescaled(true);
    } else {
      _setChoice('original');
    }
  }, [reset]);

  const chooseWhichImageToUse = useCallback((chosenChoice) => {
    _setChoice(chosenChoice);
  }, []);

  const img = useAppropriateImage({ hasBeenRescaled, choice, downscaledImage, _originalImage });

  const { cancelUpscale: _cancelUpscale, progress, upscaledSrc } = useUpscaler(img);

  const cancelUpscale = useCallback(() => {
    _cancelUpscale();
    reset();
  }, [_cancelUpscale])

  return {
    cancelUpscale,
    originalSize: _originalImage ? { width: _originalImage.el.width, height: _originalImage.el.height, } : undefined,
    progress,
    setUploadedImage,
    img,
    downscaledImage,
    hasBeenRescaled,
    chooseWhichImageToUse,
    upscaledSrc,
  };
};
