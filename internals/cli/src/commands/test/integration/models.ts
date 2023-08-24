import { Command } from '@commander-js/extra-typings';
import path from 'path';
import { TEST_DIR } from '@internals/common/constants';
import { runTests } from '../../../lib/utils/run-tests.js';
import { EsbuildBundler } from '@internals/bundlers/esbuild';
import { UMDBundler } from '@internals/bundlers/umd';
import { NodeBundler } from '@internals/bundlers/node';
import { Bundler, BundlerName } from '@internals/bundlers';

export default (program: Command) => program.command('models')
  .description('Test all available models')
  .argument('[files...]', 'Optional files to supply')
  .action(async (files, opts) => {
    const viteConfigPath = path.resolve(TEST_DIR, 'integration/models/vite.config.ts');
    await runTests(['clientside', 'serverside'], viteConfigPath, [
      EsbuildBundler,
      UMDBundler,
      NodeBundler, 
    ], files, opts);
  });

