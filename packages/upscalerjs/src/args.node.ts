import { BASE64, UpscaleArgs, TENSOR, PrivateUpscaleArgs, } from "./types";

const getOutputOption = (output?: unknown): TENSOR | BASE64 => {
  if (output === 'base64') {
    return 'base64';
  }
  return 'tensor';
};

export function getUpscaleOptions(options: Omit<UpscaleArgs, 'output' | 'progressOutput'> & { output?: unknown; progressOutput?: unknown } = {}): PrivateUpscaleArgs {
  return {
    ...options,
    output: getOutputOption(options.output),
    progressOutput: getOutputOption(options.progressOutput || options.output),
  };
}
