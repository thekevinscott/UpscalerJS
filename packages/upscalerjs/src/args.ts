import { BASE64, UpscaleArgs, TENSOR, } from "./types";

const getOutputOption = (output?: unknown): TENSOR | BASE64 => {
  if (output === 'tensor') {
    return 'tensor';
  }
  return 'base64';
};

export function getUpscaleOptions(options: Omit<UpscaleArgs, 'output' | 'progressOutput'> & { output?: unknown; progressOutput?: unknown } = {}): UpscaleArgs {
  return {
    ...options,
    output: getOutputOption(options.output),
    progressOutput: getOutputOption(options.progressOutput || options.output),
  };
}
