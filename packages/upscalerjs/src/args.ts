import { BASE64, Progress, ResultFormat, UpscaleArgs as PrivateUpscaleArgs, UpscaleArgs as PublicUpscaleArgs, } from "./types";

export function getUpscaleOptions<P extends Progress<O, PO>, O extends ResultFormat = BASE64, PO extends ResultFormat = undefined>(options: PublicUpscaleArgs<P, O, PO>): PrivateUpscaleArgs<P, O, PO> {
  return options;
}
