import { ModelDefinition, } from "@upscalerjs/core";
import { parsePatchAndInputSizes, } from "./utils";
import { BASE64, UpscaleArgs, TENSOR, PrivateUpscaleArgs, } from "./types";

const getOutputOption = (output?: unknown): TENSOR | BASE64 => {
  if (output === 'base64') {
    return 'base64';
  }
  return 'tensor';
};

export function getUpscaleOptions(modelDefinition: ModelDefinition, {
  output,
  progressOutput,
  ...options
}: Omit<UpscaleArgs, 'output' | 'progressOutput'> & { output?: unknown; progressOutput?: unknown } = {}): PrivateUpscaleArgs {
  return {
    ...options,
    ...parsePatchAndInputSizes(modelDefinition, options),
    output: getOutputOption(output),
    progressOutput: getOutputOption(progressOutput || output),
  };
}
