import { PrivateUpscaleArgs, Progress, ResultFormat, PublicUpscaleArgs, } from "./types";

export function getUpscaleOptions<P extends Progress<O, PO>, O extends ResultFormat, PO extends ResultFormat = undefined>(options: PublicUpscaleArgs<P, O, PO> = {}): PrivateUpscaleArgs<P, O, PO> {
  return {
    output: 'tensor',
    ...options,
  };
}
