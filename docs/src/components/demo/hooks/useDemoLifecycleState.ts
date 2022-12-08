import { useMemo } from "react";
import { State } from "../types";

interface Opts {
  hasBeenRescaled: boolean;
  img: HTMLImageElement;
  progress?: number;
  upscaledSrc?: string;
}

export const useDemoLifecycleState = ({
  hasBeenRescaled, 
  img,
  progress,
  upscaledSrc,
}: Opts) => useMemo(() => {
  if (progress === undefined && upscaledSrc) {
    return State.COMPLETE;
  }
  if (img) {
    return State.PROCESSING;
  }
  if (hasBeenRescaled && img === undefined) {
    return State.WARNING;
  }
  return State.UPLOAD;
}, [img, hasBeenRescaled, progress, upscaledSrc]);
