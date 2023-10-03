import { BASE64, TENSOR, GetUpscaleOptions, } from "./types";

const getOutputOption = (output?: unknown): TENSOR | BASE64 => {
  if (output === 'tensor') {
    return 'tensor';
  }
  return 'base64';
};

export const getUpscaleOptions: GetUpscaleOptions = ({
  output,
  progressOutput,
  ...options
} = {}) => {
  return {
    ...options,
    output: getOutputOption(output),
    progressOutput: getOutputOption(progressOutput || output),
  };
};
