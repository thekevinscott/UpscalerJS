import { useMemo } from "react";

export const useAppropriateImage = ({ hasBeenRescaled, choice, downscaledImage, _originalImage }) => {
  return useMemo<undefined | HTMLImageElement>(() => {
    if (hasBeenRescaled === undefined) {
      return undefined;
    }
    if (hasBeenRescaled) {
      if (choice === undefined) {
        return undefined;
      } else if (choice === 'downscaled') {
        return downscaledImage;
      } else {
        return _originalImage.el;
      }
    }
    if (choice === 'original') {
      return _originalImage?.el;
    }
    return undefined;
  }, [_originalImage, choice, hasBeenRescaled]);
}
