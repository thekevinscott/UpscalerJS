import { validateOptions, } from "./utils";
import { BASE64, UpscaleArgs, TENSOR, PrivateUpscaleArgs, } from "./types";
import { tf, } from "./dependencies.generated";

const getOutputOption = (output?: unknown): TENSOR | BASE64 => {
  if (output === 'tensor') {
    return 'tensor';
  }
  return 'base64';
};

export function getUpscaleOptions(model: tf.LayersModel | tf.GraphModel, {
  output,
  progressOutput,
  ...options
}: Omit<UpscaleArgs, 'output' | 'progressOutput'> & { output?: unknown; progressOutput?: unknown } = {}): PrivateUpscaleArgs {
  return {
    ...validateOptions(options, model),
    output: getOutputOption(output),
    progressOutput: getOutputOption(progressOutput || output),
  };
}
