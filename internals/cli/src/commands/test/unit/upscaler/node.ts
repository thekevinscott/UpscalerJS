import { Command } from '@commander-js/extra-typings';
import { UPSCALER_DIR } from '@internals/common/constants';
import { getLogLevel } from '@internals/common/logger';
import path from 'path';
import { startVitest } from 'vitest/dist/node.js';
import { scaffoldUpscaler } from '../../../scaffold/upscaler.js';

const vitestConfigPath = path.resolve(UPSCALER_DIR, 'vite.node.ts');

export default (program: Command) => program.command('node')
  .description('Run upscaler node unit tests')
  .argument('[files...]', 'Optional files to supply')
  .action(async (files, opts) => {
    await scaffoldUpscaler('node');
    process.env.logLevel = getLogLevel();

    const vitest = await startVitest('test', files, {
      ...opts,
      config: vitestConfigPath,
      root: UPSCALER_DIR,
    });

    process.on('exit', () => vitest?.close());
  });

