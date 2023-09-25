import inquirer from 'inquirer';
import { OutputFormat } from './types.mjs';

export const DEFAULT_OUTPUT_FORMATS: Array<OutputFormat> = ['cjs', 'esm', 'umd'];

const isValidOutputFormat = (outputFormat: string): outputFormat is OutputFormat => {
  for (let i = 0; i < DEFAULT_OUTPUT_FORMATS.length; i++) {
    const f = DEFAULT_OUTPUT_FORMATS[i];
    if (f === outputFormat) {
      return true;
    }
  }
  return false;
}

export const getOutputFormats = async (outputFormat?: unknown, defaultToAll?: boolean) => {
  if (typeof outputFormat === 'string' && isValidOutputFormat(outputFormat)) {
    return [outputFormat]
  }
  if (Array.isArray(outputFormat)) {
    return outputFormat;
  }
  if (defaultToAll) {
    return DEFAULT_OUTPUT_FORMATS;
  }
  const { outputFormats } = await inquirer.prompt<{
    outputFormats: string[];
  }>([
    {
      type: 'checkbox',
      name: 'outputFormats',
      message: 'Which output formats do you want to build?',
      choices: DEFAULT_OUTPUT_FORMATS,
    },
  ]);
  return outputFormats;
}

