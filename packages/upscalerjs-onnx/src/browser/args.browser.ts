/**
 * Browser default-option resolver. Matches the tfjs package's behaviour
 * (`packages/upscalerjs/src/browser/args.browser.ts`) exactly: default
 * output is `'base64'`, and `progressOutput` defaults to whatever `output` is.
 */
import type { BASE64, TENSOR, GetUpscaleOptions, } from '../shared/types';

const coerce = (o?: unknown): BASE64 | TENSOR => (o === 'tensor' ? 'tensor' : 'base64');

export const getUpscaleOptions: GetUpscaleOptions = ({ output, progressOutput, ...rest } = {}) => ({
  ...rest,
  output: coerce(output),
  progressOutput: coerce(progressOutput ?? output),
});
