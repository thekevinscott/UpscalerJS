import { Command } from '@commander-js/extra-typings';
import path from 'path';
import { TEST_DIR } from '@internals/common/constants';
import { runTests } from '../../../lib/utils/run-tests.js';
import { EsbuildBundler } from '@internals/bundlers/esbuild';
import { UMDBundler } from '@internals/bundlers/umd';
import { WebpackBundler } from '@internals/bundlers/webpack';

export default (program: Command) => program.command('clientside')
  .description('Test client side integration tests')
  .argument('[files...]', 'Optional files to supply')
  .action(async (files, opts) => {
    const viteConfigPath = path.resolve(TEST_DIR, 'integration/clientside/vite.config.ts');
    await runTests([
      'clientside',
    ], viteConfigPath, [
      EsbuildBundler,
      UMDBundler,
      WebpackBundler,
    ], files, opts);
  });


