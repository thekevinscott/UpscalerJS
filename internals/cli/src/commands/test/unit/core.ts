import { Command } from '@commander-js/extra-typings';
import { CORE_DIR } from '@internals/common/constants';
import { getLogLevel } from '@internals/common/logger';
import path from 'path';
import { startVitest } from 'vitest/dist/node.js';

const vitestConfigPath = path.resolve(CORE_DIR, 'vite.conf.ts');

export default (program: Command) => program.command('core')
  .description('Run @upscalerjs/core unit tests')
  .argument('[files...]', 'Optional files to supply')
  .action(async (files, opts) => {
    process.env.logLevel = getLogLevel();

    const vitest = await startVitest('test', files, {
      ...opts,
      config: vitestConfigPath,
      root: CORE_DIR,
    });

    process.on('exit', () => vitest?.close());
  });

