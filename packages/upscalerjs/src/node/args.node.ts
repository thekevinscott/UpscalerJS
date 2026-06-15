import { BASE64, GetUpscaleOptions, TENSOR, } from "../core/types.js";

const getOutputOption = (output?: unknown): TENSOR | BASE64 => {
  if (output === 'base64') {
    return 'base64';
  }
  return 'tensor';
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
