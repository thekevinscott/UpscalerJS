import { Command } from '@commander-js/extra-typings';
import path from 'path';
import { info } from '@internals/common/logger';
import { OutputFormat } from '@internals/common/types';
import { rimraf } from 'rimraf';
import { validateOutputFormats } from '../../lib/commands/build/validate-build-options.js';
import { buildCJS } from '../../lib/commands/build/build-cjs.js';
import { buildESM } from '../../lib/commands/build/build-esm.js';
import { CORE_DIR } from '@internals/common/constants';

const DIST = path.resolve(CORE_DIR, 'dist');

const getDistFolder = (outputFormat: OutputFormat) => path.resolve(DIST, outputFormat);

const OUTPUT_FORMAT_FNS = {
  cjs: () => buildCJS(getDistFolder('cjs'), CORE_DIR),
  esm: () => buildESM(getDistFolder('esm'), CORE_DIR),
}

export const buildCore = async (outputFormats: OutputFormat[], { shouldClearDistFolder }: { shouldClearDistFolder?: boolean } = {}) => {
  for (const outputFormat of outputFormats) {
    if (outputFormat === 'umd') {
      throw new Error('UMD is not supported for core');
    }

    if (shouldClearDistFolder) {
      info(`Clearing dist folder ${path.resolve(DIST, outputFormat)}`);
      await rimraf(path.resolve(DIST, outputFormat));
    }

    await OUTPUT_FORMAT_FNS[outputFormat]();
  }
};

export default (program: Command) => program.command('core')
  .description('Build Core')
  .option('-o, --output-format <format...>', 'What output format to build for. esm, cjs, or umd')
  .action(({
    outputFormat: _outputFormats,
    // ...rest
  }) => buildCore(
    validateOutputFormats(_outputFormats),
    // rest
  ));
