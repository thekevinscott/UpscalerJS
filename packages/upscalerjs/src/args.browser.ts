import { BASE64, Progress, ResultFormat, PrivateUpscaleArgs, PublicUpscaleArgs, } from "./types";
type DEFAULT_OUTPUT = BASE64;

export function getUpscaleOptions<P extends Progress<O, PO>, O extends ResultFormat = DEFAULT_OUTPUT, PO extends ResultFormat = undefined>(options: PublicUpscaleArgs<P, O, PO> = {}): PrivateUpscaleArgs<P, O, PO> {
  return {
    // TODO: Avoid this casting
    output: 'base64' as O,
    ...options,
  };
}
