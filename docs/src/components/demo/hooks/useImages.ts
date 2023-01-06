import { useCallback, useState } from 'react';
import type { ProcessedImage, Size, UploadedImage, UpscaleChoice } from '../types';
import { getHTMLImageElement } from '../utils/getHTMLImageElement';
import { getRecommendedImageSize } from '../utils/getRecommendedImageSize';
import { removeAlpha } from '../utils/removeAlpha';
import { resizeImage } from '../utils/resizeImage';
import { useAppropriateImage } from './useAppropriateImage';
import { useUpscaler } from './useUpscaler';

const shouldPromptToResize = (el: HTMLImageElement, recommendedSize: Size) => {
  return recommendedSize.width !== el.width || recommendedSize.height !== el.height;
}

export const useImages = () => {
  const [_originalImage, _setOriginalImage] = useState<ProcessedImage>();
  const [downscaledImage, _setDownscaledImage] = useState<HTMLCanvasElement>();
  const [downscaledImageSize, setDownscaledImageSize] = useState<HTMLCanvasElement>();
  const [hasBeenRescaled, _setHasBeenRescaled] = useState(undefined);
  const [choice, _setChoice] = useState<UpscaleChoice | undefined>();

  const reset = useCallback(() => {
    _setDownscaledImage(undefined);
    _setOriginalImage(undefined);
    _setChoice(undefined);
    _setHasBeenRescaled(undefined);
  }, [_setOriginalImage, _setDownscaledImage, _setHasBeenRescaled, _setChoice]);

  const appropriateImage = useAppropriateImage({ hasBeenRescaled, choice, downscaledImage, _originalImage });

  const {
    scale,
    cancelUpscale,
    progress,
    upscaledRef,
  } = useUpscaler(appropriateImage, _originalImage?.filename);

  const setUploadedImage = useCallback(async (uploadedImage?: UploadedImage) => {
    if (uploadedImage?.src !== _originalImage?.src) {
      reset();
      cancelUpscale();
      if (uploadedImage) {
        _setHasBeenRescaled(false);
        const { src, filename } = uploadedImage;
        // const img = await removeAlpha(await getHTMLImageElement(src));
        const img = await getHTMLImageElement(src);
        _setOriginalImage({
          src,
          filename,
          el: img,
        });
        const recommendedSize = getRecommendedImageSize(img);
        if (shouldPromptToResize(img, recommendedSize)) {
          // const downscaledImg = await getHTMLImageElement(resizeImage(img, recommendedSize.width / img.width));
          const downscaledImg = resizeImage(img, recommendedSize.width / img.width);
          _setDownscaledImage(downscaledImg);
          setDownscaledImageSize({
            width: recommendedSize.width,
            height: recommendedSize.height,
          });
          _setHasBeenRescaled(true);
        } else {
          _setChoice('original');
        }
      }
    }
  }, [_originalImage, cancelUpscale, _setOriginalImage, _setChoice, _setHasBeenRescaled, _setDownscaledImage, reset]);

  const chooseWhichImageToUse = useCallback((chosenChoice) => {
    _setChoice(chosenChoice);
  }, [_setChoice]);

  return {
    cancelUpscale,
    originalSize: _originalImage ? { width: _originalImage.el.width, height: _originalImage.el.height, } : undefined,
    filename: _originalImage?.filename,
    progress,
    setUploadedImage,
    img: appropriateImage,
    downscaledImage,
    hasBeenRescaled,
    chooseWhichImageToUse,
    upscaledRef: _originalImage?.src ? upscaledRef : undefined,
    scale,
    downscaledImageSize,
  };
};
