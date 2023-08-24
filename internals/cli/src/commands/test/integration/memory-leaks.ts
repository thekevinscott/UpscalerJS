import { Command } from '@commander-js/extra-typings';
import path from 'path';
import { EsbuildBundler } from '@internals/bundlers/esbuild';
import { runTests } from '../../../lib/utils/run-tests.js';
import { TEST_DIR } from '@internals/common/constants';

export default (program: Command) => program.command('memory-leaks')
  .description('Test the memory leaks suite of tests')
  .argument('[files...]', 'Optional files to supply')
  .action(async (files, opts) => {
    const viteConfigPath = path.resolve(TEST_DIR, 'integration/memory-leaks/vite.config.ts');
    await runTests('clientside', viteConfigPath, [EsbuildBundler], files, opts);
  });
