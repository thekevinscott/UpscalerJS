import path from 'path';
import { EsbuildBundler } from '@internals/bundlers/esbuild';
import { TEST_DIR } from '@internals/common/constants';
import { BaseIntegrationTestCommand } from '../../../lib/utils/base-integration-test-command.js';
import { collectStringArgs } from '../../../lib/utils/collect-string-args.js';
import { runTests } from '../../../lib/utils/run-tests.js';

export default class MemoryLeaks extends BaseIntegrationTestCommand<typeof BaseIntegrationTestCommand> {
  static description = 'Test the memory leaks suite of tests'

  async run(): Promise<void> {
    const { flags } = await this.parse(MemoryLeaks);
    const files = collectStringArgs(this.argv);
    const viteConfigPath = path.resolve(TEST_DIR, 'integration/memory-leaks/vite.config.ts');
    await runTests('clientside', viteConfigPath, [EsbuildBundler], files, flags);
  }
}
