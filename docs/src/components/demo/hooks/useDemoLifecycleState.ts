import { useMemo } from "react";
import { State } from "../types";

interface Opts {
  hasBeenRescaled: boolean;
  img: HTMLCanvasElement;
  progress?: number;
}

export const useDemoLifecycleState = ({
  hasBeenRescaled,
  img,
  progress,
}: Opts) => useMemo(() => {
  if (progress === 1 && img) {
    return State.COMPLETE;
  }
  if (img) {
    return State.PROCESSING;
  }
  if (hasBeenRescaled && img === undefined) {
    return State.WARNING;
  }
  return State.UPLOAD;
}, [img, hasBeenRescaled, progress]);
