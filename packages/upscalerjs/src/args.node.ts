import { parsePatchAndInputSizes, } from "./utils";
import { BASE64, UpscaleArgs, TENSOR, PrivateUpscaleArgs, ModelPackage, } from "./types";

const getOutputOption = (output?: unknown): TENSOR | BASE64 => {
  if (output === 'base64') {
    return 'base64';
  }
  return 'tensor';
};

export function getUpscaleOptions(modelPackage: ModelPackage, {
  output,
  progressOutput,
  ...options
}: Omit<UpscaleArgs, 'output' | 'progressOutput'> & { output?: unknown; progressOutput?: unknown } = {}): PrivateUpscaleArgs {
  return {
    ...options,
    ...parsePatchAndInputSizes(modelPackage, options),
    output: getOutputOption(output),
    progressOutput: getOutputOption(progressOutput || output),
  };
}
