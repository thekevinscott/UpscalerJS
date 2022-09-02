import { useMemo } from "react";
import { State } from "../types";

interface Opts {
  hasBeenRescaled: boolean;
  img: HTMLImageElement;
  progress?: number;
  upscaledSrc?: string;
  started: boolean;
}

export const useDemoLifecycleState = ({
  hasBeenRescaled, 
  img,
  progress,
  upscaledSrc,
  started,
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
  if (started) {
    return State.UPLOAD;
  }
  return State.BENCHMARKING;
}, [started, img, hasBeenRescaled, progress, upscaledSrc]);
