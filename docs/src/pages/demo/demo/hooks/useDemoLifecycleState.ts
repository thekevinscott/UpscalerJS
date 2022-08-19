import { useMemo } from "react";
import { State } from "../types";

interface Opts {
  hasBeenRescaled: boolean;
  img: HTMLImageElement;
}

export const useDemoLifecycleState = ({
  hasBeenRescaled, 
  img,
}: Opts) => useMemo(() => {
  if (img) {
    return State.PROCESSING;
  }
  if (hasBeenRescaled && img === undefined) {
    return State.WARNING;
  }
  return State.NOT_STARTED;
}, [img, hasBeenRescaled]);
