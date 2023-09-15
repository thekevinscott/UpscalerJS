import { Command } from '@commander-js/extra-typings';
import { UPSCALER_DIR } from '@internals/common/constants';
import { getLogLevel } from '@internals/common/logger';
import { scaffoldUpscaler } from '../../../../scaffold/upscaler.js';
import { spawnProcess } from '../../../../../lib/cli/spawn-process.js';

export default (program: Command) => program.command('playwright')
  .description('Run upscaler browser playwright unit tests')
  .option('-w, --watch', 'Watch mode', false)
  .action(async ({ watch }) => {
    await scaffoldUpscaler('browser');
    process.env.logLevel = getLogLevel();
    await spawnProcess(`pnpm playwright-test --config playwright.config.json ${watch ? '--watch' : ''}`, {
      cwd: UPSCALER_DIR,
    });
  });

