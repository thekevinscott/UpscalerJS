import { Command } from '@commander-js/extra-typings';
import path from 'path';
import { EsbuildBundler } from '@internals/bundlers/esbuild';
import { runTests } from '../../../lib/utils/run-tests.js';
import { TEST_DIR } from '@internals/common/constants';

export default (program: Command) => program.command('browserstack')
  .description('Test the browserstack suite of tests')
  .argument('[files...]', 'Optional files to supply')
  .action(async (files, opts) => {
    const viteConfigPath = path.resolve(TEST_DIR, 'integration/browserstack/vite.config.ts');
    if ('useTunnel' in opts && opts.useTunnel === false) {
      throw new Error('Cannot run browserstack tests without a tunnel');
    }
    await runTests('clientside', viteConfigPath, [EsbuildBundler], files, {
      ...opts,
      useTunnel: true,
    });
  });
