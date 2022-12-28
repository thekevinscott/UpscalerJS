import { BASE64, PrivateUpscaleArgs, TENSOR, } from "./types";

const getOutputOption = (output?: unknown): TENSOR | BASE64 => {
  if (output === 'tensor') {
    return 'tensor';
  }
  return 'base64';
};

export function getUpscaleOptions(options: Omit<PrivateUpscaleArgs, 'output' | 'progressOutput'> & { output?: unknown; progressOutput?: unknown } = {}): PrivateUpscaleArgs {
  return {
    ...options,
    output: getOutputOption(options.output),
    progressOutput: getOutputOption(options.progressOutput || options.output),
  };
}
