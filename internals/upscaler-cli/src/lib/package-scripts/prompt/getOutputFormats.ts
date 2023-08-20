import inquirer from 'inquirer';
import { OutputFormat } from './types';

export const DEFAULT_OUTPUT_FORMATS: Array<OutputFormat> = ['cjs', 'esm', 'umd'];

const isValidOutputFormat = (outputFormat: string): outputFormat is OutputFormat => {
  for (const f of DEFAULT_OUTPUT_FORMATS) {
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

