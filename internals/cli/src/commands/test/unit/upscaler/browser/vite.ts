import { Command } from '@commander-js/extra-typings';
import { UPSCALER_DIR } from '@internals/common/constants';
import { getLogLevel } from '@internals/common/logger';
import path from 'path';
import { startVitest } from 'vitest/dist/node.js';
import { scaffoldUpscaler } from '../../../../scaffold/upscaler.js';

const vitestConfigPath = path.resolve(UPSCALER_DIR, 'vite.browser.ts');

export default (program: Command) => program.command('vite')
  .description('Run upscaler browser vite unit tests')
  .argument('[files...]', 'Optional files to supply')
  .action(async (files, opts) => {
    await scaffoldUpscaler('browser');
    process.env.logLevel = getLogLevel();

    const vitest = await startVitest('test', files, {
      ...opts,
      config: vitestConfigPath,
      root: UPSCALER_DIR,
    });

    process.on('exit', () => vitest?.close());
  });

