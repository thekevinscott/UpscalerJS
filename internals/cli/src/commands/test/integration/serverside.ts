import { Command } from '@commander-js/extra-typings';
import path from 'path';
import { TEST_DIR } from '@internals/common/constants';
import { runTests } from '../../../lib/utils/run-tests.js';
import { NodeBundler } from '@internals/bundlers/node';
import { Bundler, BundlerName } from '@internals/bundlers';

export default (program: Command) => program.command('serverside')
  .description('Test server side integration tests')
  .argument('[files...]', 'Optional files to supply')
  .action(async (files, opts) => {
    const viteConfigPath = path.resolve(TEST_DIR, 'integration/serverside/vite.config.ts');
    await runTests(['serverside'], viteConfigPath, [NodeBundler], files, opts);
  });
